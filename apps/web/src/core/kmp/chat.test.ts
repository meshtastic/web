import { createMemoryDb } from "@core/storage/memoryDb.ts";
import { SqlocalMessageRepository } from "@core/storage/messages.ts";
import type {
  ConversationKey,
  Message,
  MessageRepository,
} from "@core/storage/types.ts";
import type { Types } from "@core/protobuf.ts";
import type { SendHandleJs } from "@meshtastic/sdk-kmp";
import { describe, expect, it, vi } from "vitest";
import {
  ChatClient,
  type ChatTransport,
  conversationFor,
  DIRECT_SEND_HOOK_TIMEOUT_MS,
} from "./chat.ts";
import { BROADCAST_NUM } from "./packets.ts";

const ME = 1;
const PEER = 2;

function transport(me = ME): ChatTransport & { sent: Uint8Array[] } {
  let next = 1000;
  const handle = (): SendHandleJs => {
    const id = next++;
    return { id, outcome: Promise.resolve({ id, ok: true, reason: null }) };
  };
  const sent: Uint8Array[] = [];
  return {
    sent,
    myNodeNum: () => me,
    sendText: () => handle(),
    sendPacket: (bytes) => {
      sent.push(bytes);
      return handle();
    },
    warn: () => {},
  };
}

const inbound = (
  id: number,
  data: string,
  extra: Partial<Types.PacketMetadata<string>> = {},
): Types.PacketMetadata<string> => ({
  id,
  rxTime: new Date(id * 1000),
  type: "direct",
  from: PEER,
  to: ME,
  channel: 0,
  data,
  ...extra,
});

async function setup() {
  const db = await createMemoryDb();
  const open = (limit = 50, me = ME) =>
    new ChatClient(transport(me), {
      repository: new SqlocalMessageRepository(db, { deviceId: ME }),
      initialLoadLimit: limit,
    });
  const repo = () => new SqlocalMessageRepository(db, { deviceId: ME });
  return { open, repo };
}

describe("conversationFor", () => {
  it("files DMs under the peer and broadcasts under the channel", () => {
    expect(conversationFor(PEER, 3)).toEqual({
      key: { kind: "direct", peer: PEER },
      to: PEER,
      type: "direct",
    });
    expect(conversationFor("broadcast", 3)).toEqual({
      key: { kind: "channel", channel: 3 },
      to: BROADCAST_NUM,
      type: "broadcast",
    });
  });
});

describe("ChatClient with storage", () => {
  it("restores unread counts and previews after a reload", async () => {
    const { open } = await setup();
    const first = open();
    first.receive(inbound(1, "one"));
    first.receive(inbound(2, "two"));
    first.receive(inbound(3, "all", { type: "broadcast", to: BROADCAST_NUM }));
    first.markRead({ kind: "channel", channel: 0 });
    await first.flush();

    const second = open();
    await vi.waitFor(() => expect(second.summaries.value.size).toBe(2));
    expect(second.unread.byKey.value).toEqual(new Map([[`direct:${PEER}`, 2]]));
    expect(
      second.summaries.value.get(`direct:${PEER}`)?.lastMessage?.text,
    ).toBe("two");
  });

  it("tracks unread mentions of me, live and after a reload", async () => {
    const { open } = await setup();
    const first = open();
    const channel = { type: "broadcast", to: BROADCAST_NUM } as const;
    first.receive(inbound(1, "hey @!00000001", channel));
    first.receive(inbound(2, "hey @!0000000100 (longer id)", channel));
    first.receive(inbound(3, "no mention", channel));
    first.receive(inbound(4, "@!00000001 again", { ...channel, from: 9 }));
    // Mine never counts.
    first.receive(inbound(5, "@!00000001 me", { ...channel, from: ME }));
    expect(first.unread.mentionsByKey.value).toEqual(
      new Map([["channel:0", [PEER, 9]]]),
    );
    await first.flush();

    const second = open();
    await vi.waitFor(() =>
      expect(second.unread.mentionsByKey.value).toEqual(
        new Map([["channel:0", [PEER, 9]]]),
      ),
    );
    second.markRead({ kind: "channel", channel: 0 });
    expect(second.unread.mentionsByKey.value.size).toBe(0);
    await second.flush();
    const third = open();
    await vi.waitFor(() => expect(third.summaries.value.size).toBe(1));
    expect(third.unread.mentionsByKey.value.size).toBe(0);
  });

  it("tells unread subscribers about the first change", () => {
    const chat = new ChatClient(transport());
    const calls = { byKey: 0, mentionsByKey: 0, total: 0, count: 0 };
    chat.unread.byKey.subscribe(() => calls.byKey++);
    chat.unread.mentionsByKey.subscribe(() => calls.mentionsByKey++);
    chat.unread.total.subscribe(() => calls.total++);
    chat.unread
      .count({ kind: "channel", channel: 0 })
      .subscribe(() => calls.count++);
    chat.receive(
      inbound(1, "@!00000001", { type: "broadcast", to: BROADCAST_NUM }),
    );
    expect(calls).toEqual({ byKey: 1, mentionsByKey: 1, total: 1, count: 1 });
  });

  it("keeps a mention that arrives after a read while the load is in flight", async () => {
    const { open } = await setup();
    const first = open();
    first.receive(inbound(1, "before"));
    await first.flush();

    const second = open();
    second.markRead({ kind: "direct", peer: PEER });
    second.receive(inbound(2, "@!00000001 after"));
    await vi.waitFor(() =>
      expect(
        second.summaries.value.get(`direct:${PEER}`)?.lastMessage?.text,
      ).toBe("@!00000001 after"),
    );
    await second.flush();
    expect(second.unread.byKey.value).toEqual(new Map([[`direct:${PEER}`, 1]]));
    expect(second.unread.mentionsByKey.value).toEqual(
      new Map([[`direct:${PEER}`, [PEER]]]),
    );
  });

  it("doesn't count a mention in the open conversation", () => {
    const chat = new ChatClient(transport());
    chat.unread.setActive({ kind: "channel", channel: 0 });
    chat.receive(
      inbound(1, "@!00000001", { type: "broadcast", to: BROADCAST_NUM }),
    );
    expect(chat.unread.mentionsByKey.value.size).toBe(0);
  });

  it("loads unread counts only once my node is known, and keeps the open conversation read", async () => {
    const { open } = await setup();
    const first = open();
    first.receive(inbound(1, "dm one"));
    first.receive(inbound(2, "dm two"));
    const channel = { type: "broadcast" as const, to: BROADCAST_NUM };
    first.receive(inbound(3, "theirs", channel));
    first.receive(inbound(4, "mine", { ...channel, from: ME }));
    await first.send({ text: "sent", destination: "broadcast" });
    await first.flush();

    // Before the handshake: no node number yet, and the DM is already open.
    const second = open(50, 0);
    second.unread.setActive({ kind: "direct", peer: PEER });
    await second.flush();
    expect(second.summaries.value.size).toBe(0);

    second.setMyNodeNum(ME);
    await vi.waitFor(() => expect(second.summaries.value.size).toBe(2));
    expect(second.unread.byKey.value).toEqual(new Map([["channel:0", 1]]));
    expect(second.unread.total.value).toBe(1);
  });

  it("keeps the open conversation read across a reload", async () => {
    const { open } = await setup();
    const first = open();
    first.unread.setActive({ kind: "direct", peer: PEER });
    first.receive(inbound(1, "while open"));
    expect(first.unread.total.value).toBe(0);
    await first.flush();

    const second = open();
    await vi.waitFor(() => expect(second.summaries.value.size).toBe(1));
    expect(second.unread.total.value).toBe(0);
  });

  it("reloads reactions and quotes reply targets outside the loaded window", async () => {
    const { open } = await setup();
    const first = open();
    first.receive(inbound(1, "original"));
    first.receive(inbound(2, "filler"));
    first.receive(inbound(3, "a reply", { replyId: 1 }));
    first.receive(inbound(4, "❤️", { replyId: 3, emoji: 1 }));
    await first.flush();

    const second = open(1);
    const thread = second.thread({ kind: "direct", peer: PEER });
    await vi.waitFor(() => {
      expect(thread.value).toHaveLength(1);
      expect(thread.value[0]?.reactions).toEqual([
        { emoji: "❤️", count: 1, mine: false, fromNodes: [PEER] },
      ]);
      expect(thread.value[0]?.replyTo).toEqual({
        kind: "resolved",
        id: 1,
        from: PEER,
        excerpt: "original",
      });
    });
  });

  it("removes my reaction from storage when toggled off", async () => {
    const { open, repo } = await setup();
    const first = open();
    first.receive(inbound(1, "hi"));
    const input = { targetId: 1, emoji: "👍", destination: PEER };
    await first.toggleReaction(input);
    await first.flush();
    expect(await repo().loadReactions([1])).toMatchObject([
      { fromNode: ME, emoji: "👍" },
    ]);

    await first.toggleReaction(input);
    await first.flush();
    expect(await repo().loadReactions([1])).toEqual([]);
  });

  it("survives a repository whose newer methods throw synchronously", () => {
    // Like the older test doubles, which lack these methods entirely.
    const missing = (): never => {
      throw new TypeError("not a function");
    };
    const repository: MessageRepository = {
      loadRecent: async () => [],
      loadBefore: async () => [],
      append: async () => {},
      appendBatch: async () => {},
      updateState: async () => {},
      updateDelivery: async () => {},
      remove: async () => {},
      prune: async () => {},
      clearConversation: async () => {},
      clear: async () => {},
      findByIds: missing,
      loadReactions: missing,
      addReaction: missing,
      removeReaction: missing,
      updateReactionDelivery: missing,
      loadConversations: missing,
      markRead: missing,
    };
    const warn = vi.fn();
    const chat = new ChatClient({ ...transport(), warn }, { repository });
    expect(() => chat.receive(inbound(1, "hi"))).not.toThrow();
    expect(() => chat.markRead({ kind: "direct", peer: PEER })).not.toThrow();
    expect(chat.unread.total.value).toBe(0);
  });

  it("keeps writing after a failed write", async () => {
    const db = await createMemoryDb();
    class FlakyRepository extends SqlocalMessageRepository {
      failNext = true;
      override async append(
        message: Message,
        key?: ConversationKey,
      ): Promise<void> {
        if (this.failNext) {
          this.failNext = false;
          throw new Error("disk full");
        }
        return super.append(message, key);
      }
    }
    const repository = new FlakyRepository(db, { deviceId: ME });
    const warn = vi.fn();
    const chat = new ChatClient({ ...transport(), warn }, { repository });
    chat.receive(inbound(1, "lost"));
    chat.receive(inbound(2, "kept"));
    await chat.flush();
    expect(warn).toHaveBeenCalledTimes(1);
    const stored = await repository.loadRecent(
      { kind: "direct", peer: PEER },
      10,
    );
    expect(stored.map((m) => m.text)).toEqual(["kept"]);
  });

  it("pages older history without skipping messages that share a second", async () => {
    const { open } = await setup();
    const first = open();
    for (const id of [1, 2, 3, 4]) {
      first.receive(inbound(id, `m${id}`, { rxTime: new Date(5000) }));
    }
    await first.flush();

    const second = open(2);
    const direct = second.direct(PEER);
    await vi.waitFor(() => expect(direct.value).toHaveLength(2));
    await second.loadOlder({ kind: "direct", peer: PEER }, undefined, 1);
    await second.loadOlder({ kind: "direct", peer: PEER }, undefined, 1);
    expect(direct.value.map((m) => m.text)).toEqual(["m1", "m2", "m3", "m4"]);
    expect(
      await second.loadOlder({ kind: "direct", peer: PEER }, undefined, 1),
    ).toEqual([]);
  });

  it("prunes on the first append and then only now and then", async () => {
    const db = await createMemoryDb();
    const repository = new SqlocalMessageRepository(db, { deviceId: ME });
    const prune = vi.spyOn(repository, "prune");
    const chat = new ChatClient(transport(), {
      repository,
      retention: { maxPerBucket: 100 },
      now: () => 0,
    });
    for (let id = 1; id <= 10; id++) chat.receive(inbound(id, `m${id}`));
    await chat.flush();
    expect(prune).toHaveBeenCalledTimes(1);
  });
});

describe("ChatClient direct-send hook", () => {
  it("runs before direct messages and their resends, not channel messages", async () => {
    const onDirectSend = vi.fn(async () => {});
    const chat = new ChatClient(transport(), { onDirectSend });
    await chat.send({ text: "hi", destination: "broadcast" });
    expect(onDirectSend).not.toHaveBeenCalled();
    const sent = await chat.send({ text: "hi", destination: PEER });
    expect(onDirectSend).toHaveBeenCalledWith(PEER);
    await chat.resend({
      id: sent.unwrap(),
      text: "hi",
      to: PEER,
      channel: 0,
      type: "direct",
    });
    expect(onDirectSend).toHaveBeenCalledTimes(2);
  });
});

describe("ChatClient direct-send ordering", () => {
  it("sends the text only after the hook settles", async () => {
    const order: string[] = [];
    let finish = () => {};
    const t = transport();
    const sendText = t.sendText;
    t.sendText = (...args) => {
      order.push("text");
      return sendText(...args);
    };
    const chat = new ChatClient(t, {
      onDirectSend: () =>
        new Promise<void>((resolve) => {
          finish = () => {
            order.push("hook");
            resolve();
          };
        }),
    });
    const sending = chat.send({ text: "hi", destination: PEER });
    await Promise.resolve();
    expect(order).toEqual([]);
    finish();
    await sending;
    expect(order).toEqual(["hook", "text"]);
  });

  it("sends anyway when the hook fails or hangs", async () => {
    vi.useFakeTimers();
    try {
      const failing = new ChatClient(transport(), {
        onDirectSend: () => Promise.reject(new Error("radio said no")),
      });
      expect(
        (await failing.send({ text: "a", destination: PEER })).isOk(),
      ).toBe(true);
      const hanging = new ChatClient(transport(), {
        onDirectSend: () => new Promise<void>(() => {}),
      });
      const sending = hanging.send({ text: "b", destination: PEER });
      await vi.advanceTimersByTimeAsync(DIRECT_SEND_HOOK_TIMEOUT_MS);
      expect((await sending).isOk()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ChatClient relay node", () => {
  const NONE = 0;

  it("keeps a received message's relay byte across a reload", async () => {
    const { open } = await setup();
    const first = open();
    const direct = first.direct(PEER);
    first.receive(inbound(1, "relayed", { relayNode: 0x5a, hopsAway: 2 }));
    first.receive(inbound(2, "unset", { relayNode: 0 }));
    // Ours from another app on this radio: its byte is our own.
    first.receive(
      inbound(3, "echo", { from: ME, to: PEER, relayNode: ME & 0xff }),
    );
    expect(direct.value.map((m) => m.relayNode)).toEqual([
      0x5a,
      undefined,
      undefined,
    ]);
    await first.flush();

    const second = open();
    const reloaded = second.direct(PEER);
    await vi.waitFor(() => expect(reloaded.value).toHaveLength(3));
    expect(reloaded.value.map((m) => m.relayNode)).toEqual([
      0x5a,
      undefined,
      undefined,
    ]);
  });

  it("keeps no relay byte from text received before our node is known", async () => {
    const { open } = await setup();
    // An echo of our own text can't be told from a peer's yet, and once it
    // counts as outgoing it may only show its ack's relay.
    const chat = open(50, 0);
    const direct = chat.direct(PEER);
    chat.receive(inbound(1, "early", { relayNode: 0x5a, hopsAway: 2 }));
    expect(direct.value[0]?.relayNode).toBeUndefined();
  });

  it("keeps a sent message's ack relay across a reload", async () => {
    const { open } = await setup();
    const first = open();
    const id = (
      await first.sendText({ text: "hi", destination: PEER })
    ).unwrap();
    first.applyAck(id, 9, 0, undefined, 0x5a);
    await first.flush();

    const second = open();
    const reloaded = second.direct(PEER);
    await vi.waitFor(() => expect(reloaded.value).toHaveLength(1));
    expect(reloaded.value[0]?.relayNode).toBe(0x5a);
  });

  it("records the relay each ack came back through", async () => {
    const { open } = await setup();
    const chat = open();
    const sent = await chat.sendText({ text: "hi", destination: PEER });
    expect(sent.isOk()).toBe(true);
    const id = sent.unwrap();
    const direct = chat.direct(PEER);
    const relayOf = () => direct.value.find((m) => m.id === id)?.relayNode;

    chat.applyAck(id, 9, NONE, undefined, 0x5a);
    expect(relayOf()).toBe(0x5a);
    // The recipient's ack replaces it, here with no relay (heard direct).
    chat.applyAck(id, PEER, NONE, undefined);
    expect(relayOf()).toBeUndefined();
    // Once the recipient acked, later acks change nothing.
    chat.applyAck(id, 9, NONE, undefined, 0x77);
    expect(relayOf()).toBeUndefined();
  });

  it("keeps the relay of an ack that arrives before its message is stored", async () => {
    const { open } = await setup();
    const chat = open();
    // The SDK assigns ids from 1000 in this transport.
    chat.applyAck(1000, PEER, NONE, undefined, 0x5a);
    const sent = await chat.sendText({ text: "hi", destination: PEER });
    expect(sent.unwrap()).toBe(1000);
    await vi.waitFor(() =>
      expect(
        chat.direct(PEER).value.find((m) => m.id === 1000)?.relayNode,
      ).toBe(0x5a),
    );
  });
});
