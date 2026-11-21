import { Types } from "@core/protobuf.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MultiTabCoordinator } from "./coordinator.ts";
import type { SqlocalDb } from "./db.ts";
import { createMemoryDb } from "./memoryDb.ts";
import { SqlocalMessageRepository } from "./messages.ts";
import {
  type ConversationKey,
  conversationKeyString,
  type Message,
  MessageState,
  type Reaction,
} from "./types.ts";

const PRIMARY: ConversationKey = {
  kind: "channel",
  channel: Types.ChannelNumber.Primary,
};

function msg(id: number, ms: number, text = "t"): Message {
  return {
    id,
    from: 1,
    to: 0xffffffff,
    channel: Types.ChannelNumber.Primary,
    rxTime: new Date(ms),
    type: "broadcast",
    text,
    state: MessageState.Ack,
  };
}

describe("SqlocalMessageRepository (sql.js test driver)", () => {
  let db: SqlocalDb;
  let repo: SqlocalMessageRepository;

  beforeEach(async () => {
    db = await createMemoryDb();
    repo = new SqlocalMessageRepository(db, { deviceId: 1 });
  });

  it("loadRecent returns the tail in chronological order", async () => {
    await repo.appendBatch([msg(1, 1000), msg(2, 2000), msg(3, 3000)]);
    const out = await repo.loadRecent(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      2,
    );
    expect(out.map((m) => m.id)).toEqual([2, 3]);
  });

  it("loadBefore paginates older messages", async () => {
    await repo.appendBatch([
      msg(1, 1000),
      msg(2, 2000),
      msg(3, 3000),
      msg(4, 4000),
    ]);
    const out = await repo.loadBefore(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      { rxTime: new Date(3000) },
      10,
    );
    expect(out.map((m) => m.id)).toEqual([1, 2]);
  });

  it("pages through messages sharing one rxTime by arrival order", async () => {
    await repo.appendBatch([
      msg(1, 1000),
      msg(2, 2000),
      msg(3, 2000),
      msg(4, 2000),
      msg(5, 3000),
    ]);
    const recent = await repo.loadRecent(PRIMARY, 2);
    expect(recent.map((m) => m.id)).toEqual([4, 5]);
    const oldest = recent[0];
    if (!oldest) throw new Error("expected a message");
    const page = await repo.loadBefore(
      PRIMARY,
      { rxTime: oldest.rxTime, seq: oldest.seq },
      2,
    );
    expect(page.map((m) => m.id)).toEqual([2, 3]);
    const last = page[0];
    if (!last) throw new Error("expected a message");
    const rest = await repo.loadBefore(
      PRIMARY,
      { rxTime: last.rxTime, seq: last.seq },
      10,
    );
    expect(rest.map((m) => m.id)).toEqual([1]);
  });

  it("round-trips how a message was received, keeping 0 readings", async () => {
    await repo.append({
      ...msg(7, 1000),
      snr: 0,
      rssi: -97,
      hopsAway: 0,
      viaMqtt: true,
      transport: 0,
    });
    await repo.append(msg(8, 2000));
    const [withRadio, without] = await repo.loadRecent(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      2,
    );
    expect(withRadio).toMatchObject({
      snr: 0,
      rssi: -97,
      hopsAway: 0,
      viaMqtt: true,
      transport: 0,
    });
    expect(without?.snr).toBeUndefined();
    expect(without?.rssi).toBeUndefined();
    expect(without?.hopsAway).toBeUndefined();
    expect(without?.viaMqtt).toBeUndefined();
    expect(without?.transport).toBeUndefined();
  });

  it("files a message under the conversation it is given", async () => {
    const sent: Message = {
      ...msg(5, 1000, "hi"),
      from: 1,
      to: 2,
      type: "direct",
    };
    await repo.append(sent, { kind: "direct", peer: 2 });
    expect(
      (await repo.loadRecent({ kind: "direct", peer: 2 }, 10)).map((m) => m.id),
    ).toEqual([5]);
    expect(await repo.loadRecent({ kind: "direct", peer: 1 }, 10)).toEqual([]);
  });

  it("stores a packet once per sender and keeps its reply id", async () => {
    await repo.append({ ...msg(9, 1000, "reply"), replyId: 4 });
    await repo.append({ ...msg(9, 1000, "dup") });
    await repo.append({ ...msg(9, 1500, "other sender"), from: 2 });
    const out = await repo.loadRecent(PRIMARY, 10);
    expect(out.map((m) => [m.from, m.text, m.replyId])).toEqual([
      [1, "reply", 4],
      [2, "other sender", undefined],
    ]);
  });

  it("finds messages by packet id", async () => {
    await repo.appendBatch([msg(1, 1000, "a"), msg(2, 2000, "b")]);
    const found = await repo.findByIds([2, 3]);
    expect(found.map((m) => m.text)).toEqual(["b"]);
    expect(await repo.findByIds([])).toEqual([]);
  });

  describe("reactions", () => {
    const reaction = (
      targetId: number,
      fromNode: number,
      emoji: string,
      packetId = 500 + fromNode,
    ): Reaction => ({
      targetId,
      fromNode,
      emoji,
      packetId,
      to: 0xffffffff,
      rxTime: new Date(1000 + fromNode),
      state: MessageState.Ack,
    });

    it("keeps one per target, sender and emoji (ignoring U+FE0F)", async () => {
      await repo.addReaction(reaction(1, 2, "❤️"), PRIMARY);
      await repo.addReaction(reaction(1, 2, "❤"), PRIMARY);
      await repo.addReaction(reaction(1, 3, "❤"), PRIMARY);
      await repo.addReaction(reaction(7, 3, "👍"), PRIMARY);
      const out = await repo.loadReactions([1]);
      expect(out.map((r) => [r.fromNode, r.emoji])).toEqual([
        [2, "❤️"],
        [3, "❤"],
      ]);
    });

    it("removes one locally and tracks delivery by packet id", async () => {
      await repo.addReaction(
        { ...reaction(1, 1, "👍", 77), state: MessageState.Pending },
        PRIMARY,
      );
      await repo.updateReactionDelivery(
        { packetId: 77, fromNode: 2 },
        {
          state: MessageState.Ack,
        },
      );
      expect((await repo.loadReactions([1]))[0]?.state).toBe(
        MessageState.Pending,
      );
      await repo.updateReactionDelivery(
        { packetId: 77, fromNode: 1 },
        {
          state: MessageState.Failed,
          routingError: 5,
        },
      );
      expect(await repo.loadReactions([1])).toMatchObject([
        { state: MessageState.Failed, routingError: 5 },
      ]);
      await repo.removeReaction(1, 1, "👍");
      expect(await repo.loadReactions([1])).toEqual([]);
    });

    it("drops reactions with the messages they belong to", async () => {
      await repo.appendBatch([msg(1, 1000), msg(2, 2000)]);
      await repo.addReaction(reaction(1, 2, "👍"), PRIMARY);
      await repo.addReaction(reaction(2, 2, "👍"), PRIMARY);
      await repo.prune({ maxPerBucket: 1 });
      expect((await repo.loadReactions([1, 2])).map((r) => r.targetId)).toEqual(
        [2],
      );
      await repo.clearConversation(PRIMARY);
      expect(await repo.loadReactions([2])).toEqual([]);
    });
  });

  describe("conversations and read markers", () => {
    const ME = 1;
    const dm = (id: number, from: number, text: string): Message => ({
      ...msg(id, id * 1000, text),
      from,
      to: from === ME ? 2 : ME,
      type: "direct",
    });
    const DM: ConversationKey = { kind: "direct", peer: 2 };

    it("summarises each conversation's latest message and unread count", async () => {
      await repo.append(dm(1, 2, "hi"), DM);
      await repo.append(dm(2, 2, "there"), DM);
      await repo.append(dm(3, ME, "hey"), DM);
      await repo.append({ ...msg(4, 500, "all"), from: 3 }, PRIMARY);

      const out = await repo.loadConversations(ME);
      const byKey = new Map(out.map((c) => [conversationKeyString(c.key), c]));
      expect(byKey.get("direct:2")).toMatchObject({
        lastMessage: { id: 3, text: "hey" },
        unread: 2,
      });
      expect(byKey.get("channel:0")).toMatchObject({
        lastMessage: { id: 4 },
        unread: 1,
      });
    });

    it("counts only what arrived after the read marker", async () => {
      await repo.append(dm(1, 2, "hi"), DM);
      await repo.markRead(DM);
      // Arrival order counts, not the radio's clock: this one is stamped
      // earlier but arrived later.
      await repo.append({ ...dm(2, 2, "late"), rxTime: new Date(1) }, DM);
      const [conv] = await repo.loadConversations(ME);
      expect(conv?.unread).toBe(1);

      await repo.markRead(DM);
      expect((await repo.loadConversations(ME))[0]?.unread).toBe(0);
    });

    it("marking an empty conversation read is a no-op", async () => {
      await repo.markRead(DM);
      expect(await repo.loadConversations(ME)).toEqual([]);
    });
  });

  it("updateState mutates the matching row", async () => {
    await repo.append(msg(42, 1000));
    await repo.updateState({ id: 42, from: 2 }, MessageState.Failed);
    expect((await repo.loadRecent(PRIMARY, 1))[0]?.state).toBe(
      MessageState.Ack,
    );
    await repo.updateState({ id: 42, from: 1 }, MessageState.Failed);
    const [found] = await repo.loadRecent(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      1,
    );
    expect(found?.state).toBe(MessageState.Failed);
  });

  it("prune enforces maxPerBucket", async () => {
    await repo.appendBatch([
      msg(1, 1000),
      msg(2, 2000),
      msg(3, 3000),
      msg(4, 4000),
    ]);
    await repo.prune({ maxPerBucket: 2 });
    const out = await repo.loadRecent(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      10,
    );
    expect(out.map((m) => m.id)).toEqual([3, 4]);
  });

  it("prune enforces olderThanMs", async () => {
    const now = Date.now();
    await repo.appendBatch([
      msg(1, now - 1000 * 60 * 60 * 24 * 10),
      msg(2, now),
    ]);
    await repo.prune({ olderThanMs: 1000 * 60 * 60 * 24 });
    const out = await repo.loadRecent(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      10,
    );
    expect(out.map((m) => m.id)).toEqual([2]);
  });

  it("isolates devices via device_id scoping", async () => {
    const repoB = new SqlocalMessageRepository(db, { deviceId: 2 });
    await repo.append(msg(1, 1000, "from-1"));
    await repoB.append(msg(2, 2000, "from-2"));
    const a = await repo.loadRecent(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      10,
    );
    const b = await repoB.loadRecent(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      10,
    );
    expect(a.map((m) => m.text)).toEqual(["from-1"]);
    expect(b.map((m) => m.text)).toEqual(["from-2"]);
  });

  it("setScope moves reads, writes and pruning to the new scope", async () => {
    const channel: ConversationKey = {
      kind: "channel",
      channel: Types.ChannelNumber.Primary,
    };
    await repo.appendBatch([msg(1, 1000, "old"), msg(2, 2000, "old")]);

    repo.setScope(0xabcd);
    expect(await repo.loadRecent(channel, 10)).toEqual([]);
    await repo.append(msg(3, 3000, "new"), channel);
    await repo.append(msg(4, 4000, "new"), channel);
    await repo.prune({ maxPerBucket: 1 });
    await repo.updateState({ id: 1, from: 1 }, MessageState.Failed);
    expect(
      (await repo.loadRecent(channel, 10)).map((m) => [m.id, m.text]),
    ).toEqual([[4, "new"]]);

    const old = new SqlocalMessageRepository(db, { deviceId: 1 });
    const untouched = await old.loadRecent(channel, 10);
    expect(untouched.map((m) => m.id)).toEqual([1, 2]);
    expect(untouched.map((m) => m.state)).toEqual([
      MessageState.Ack,
      MessageState.Ack,
    ]);
  });

  it("broadcasts changes under the current scope", async () => {
    const coordinator = new MultiTabCoordinator();
    const broadcast = vi.spyOn(coordinator, "broadcast");
    const scoped = new SqlocalMessageRepository(db, {
      deviceId: 1,
      coordinator,
    });
    scoped.setScope(0xabcd);
    await scoped.append(msg(5, 5000));
    expect(broadcast.mock.calls).toEqual([
      [{ kind: "messages-changed", deviceId: 0xabcd, key: "channel:0" }],
    ]);
    coordinator.close();
  });
});
