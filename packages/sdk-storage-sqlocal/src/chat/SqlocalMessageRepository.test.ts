import {
  ChannelNumber,
  type Message,
  MessageState,
  Protobuf,
} from "@meshtastic/sdk";
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlocalDb } from "../db.ts";
import { createMemoryDb } from "../testing/createMemoryDb.ts";
import { SqlocalMessageRepository } from "./SqlocalMessageRepository.ts";

const LOCAL_NODE = 100;
const PEER_NODE = 200;

function msg(
  id: number,
  ms: number,
  text = "t",
  state = MessageState.Ack,
): Message {
  return {
    id,
    from: 1,
    to: 0xffffffff,
    channel: ChannelNumber.Primary,
    rxTime: new Date(ms),
    type: "broadcast",
    text,
    state,
  };
}

function directMsg(
  id: number,
  from: number,
  to: number,
  state = MessageState.Ack,
  routingError?: Protobuf.Mesh.Routing_Error,
): Message {
  return {
    id,
    from,
    to,
    channel: ChannelNumber.Primary,
    rxTime: new Date(1000),
    type: "direct",
    text: "dm",
    state,
    routingError,
  };
}

describe("SqlocalMessageRepository (sql.js test driver)", () => {
  let db: SqlocalDb;
  let repo: SqlocalMessageRepository;

  beforeEach(async () => {
    db = await createMemoryDb();
    repo = new SqlocalMessageRepository(db, {
      deviceId: 1,
      localNodeNum: LOCAL_NODE,
    });
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

  it("updateState mutates the matching row", async () => {
    await repo.append(msg(42, 1000, "t", MessageState.Pending));
    await repo.updateState(
      42,
      MessageState.Failed,
      Protobuf.Mesh.Routing_Error.NO_CHANNEL,
    );
    const [found] = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      1,
    );
    expect(found?.state).toBe(MessageState.Failed);
    expect(found?.routingError).toBe(Protobuf.Mesh.Routing_Error.NO_CHANNEL);
  });

  it("does not downgrade an ack state", async () => {
    await repo.append(msg(43, 1000));
    await repo.updateState(43, MessageState.Relayed);

    const [found] = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      1,
    );
    expect(found?.state).toBe(MessageState.Ack);
  });

  it("reloads outbound direct messages from the recipient conversation", async () => {
    await repo.append(
      directMsg(7, LOCAL_NODE, PEER_NODE, MessageState.Pending),
    );
    await repo.updateState(
      7,
      MessageState.Failed,
      Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
    );

    const out = await repo.loadRecent({ kind: "direct", peer: PEER_NODE }, 10);
    expect(out).toHaveLength(1);
    expect(out[0]?.state).toBe(MessageState.Failed);
    expect(out[0]?.routingError).toBe(
      Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
    );
  });

  it("reloads inbound direct messages from the sender conversation", async () => {
    await repo.append(directMsg(8, PEER_NODE, LOCAL_NODE));

    const out = await repo.loadRecent({ kind: "direct", peer: PEER_NODE }, 10);
    expect(out.map((m) => m.id)).toEqual([8]);
  });

  it("keeps final status when a stale duplicate append arrives later", async () => {
    const pending = msg(9, 1000, "stale", MessageState.Pending);
    await repo.append(pending);
    await repo.updateState(
      pending.id,
      MessageState.Failed,
      Protobuf.Mesh.Routing_Error.NO_CHANNEL,
    );
    await repo.append(pending);

    const out = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      10,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.state).toBe(MessageState.Failed);
    expect(out[0]?.routingError).toBe(Protobuf.Mesh.Routing_Error.NO_CHANNEL);
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
