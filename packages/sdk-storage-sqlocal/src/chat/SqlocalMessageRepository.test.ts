import { ChannelNumber, type Message, MessageState } from "@meshtastic/sdk";
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlocalDb } from "../db.ts";
import { createMemoryDb } from "../testing/createMemoryDb.ts";
import { SqlocalMessageRepository } from "./SqlocalMessageRepository.ts";

function msg(id: number, ms: number, text = "t"): Message {
  return {
    id,
    from: 1,
    to: 0xffffffff,
    channel: ChannelNumber.Primary,
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
      { kind: "channel", channel: ChannelNumber.Primary },
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
      { kind: "channel", channel: ChannelNumber.Primary },
      new Date(3000),
      10,
    );
    expect(out.map((m) => m.id)).toEqual([1, 2]);
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
      { kind: "channel", channel: ChannelNumber.Primary },
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

  it("refiles sent direct messages filed under our own node", async () => {
    const direct = (id: number, from: number, to: number): Message => ({
      ...msg(id, id * 1000),
      from,
      to,
      type: "direct",
    });
    // What older versions wrote: everything under direct:<from>.
    await repo.appendBatch([
      direct(1, 1, 2), // sent by us (node 1) to 2: misfiled
      direct(2, 2, 1), // received from 2: already right
      direct(3, 1, 1), // a note to ourselves: stays put
    ]);

    expect(await repo.refileSentDirect(1)).toBe(1);
    expect(
      (await repo.loadRecent({ kind: "direct", peer: 2 }, 10)).map((m) => m.id),
    ).toEqual([1, 2]);
    expect(
      (await repo.loadRecent({ kind: "direct", peer: 1 }, 10)).map((m) => m.id),
    ).toEqual([3]);
    expect(await repo.refileSentDirect(1)).toBe(0);
  });

  it("updateState mutates the matching row", async () => {
    await repo.append(msg(42, 1000));
    await repo.updateState(42, MessageState.Failed);
    const [found] = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
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
      { kind: "channel", channel: ChannelNumber.Primary },
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
      { kind: "channel", channel: ChannelNumber.Primary },
      10,
    );
    expect(out.map((m) => m.id)).toEqual([2]);
  });

  it("isolates devices via device_id scoping", async () => {
    const repoB = new SqlocalMessageRepository(db, { deviceId: 2 });
    await repo.append(msg(1, 1000, "from-1"));
    await repoB.append(msg(2, 2000, "from-2"));
    const a = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      10,
    );
    const b = await repoB.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      10,
    );
    expect(a.map((m) => m.text)).toEqual(["from-1"]);
    expect(b.map((m) => m.text)).toEqual(["from-2"]);
  });
});
