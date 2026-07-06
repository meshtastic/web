import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { ChannelNumber } from "../../../../core/types.ts";
import type { Message } from "../../domain/Message.ts";
import { MessageState } from "../../domain/MessageState.ts";
import { InMemoryMessageRepository } from "./InMemoryMessageRepository.ts";

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

describe("InMemoryMessageRepository", () => {
  it("loadRecent returns the tail of a bucket", async () => {
    const repo = new InMemoryMessageRepository();
    await repo.appendBatch([msg(1, 1000), msg(2, 2000), msg(3, 3000)]);
    const out = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      2,
    );
    expect(out.map((m) => m.id)).toEqual([2, 3]);
  });

  it("loadBefore paginates older messages", async () => {
    const repo = new InMemoryMessageRepository();
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

  it("updateState mutates the matching message", async () => {
    const repo = new InMemoryMessageRepository();
    await repo.append(msg(42, 1000, "t", MessageState.Pending));
    await repo.updateState(
      42,
      MessageState.Failed,
      Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
    );
    const [found] = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      1,
    );
    expect(found?.state).toBe(MessageState.Failed);
    expect(found?.routingError).toBe(
      Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
    );
  });

  it("does not downgrade an ack state", async () => {
    const repo = new InMemoryMessageRepository();
    await repo.append(msg(43, 1000));
    await repo.updateState(43, MessageState.Relayed);

    const [found] = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      1,
    );
    expect(found?.state).toBe(MessageState.Ack);
  });

  it("allows actionable failures to replace a relayed state", async () => {
    const repo = new InMemoryMessageRepository();
    await repo.append(msg(44, 1000, "t", MessageState.Relayed));
    await repo.updateState(
      44,
      MessageState.Failed,
      Protobuf.Mesh.Routing_Error.PKI_SEND_FAIL_PUBLIC_KEY,
    );

    const [found] = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      1,
    );
    expect(found?.state).toBe(MessageState.Failed);
    expect(found?.routingError).toBe(
      Protobuf.Mesh.Routing_Error.PKI_SEND_FAIL_PUBLIC_KEY,
    );
  });

  it("keys outbound direct messages by recipient peer", async () => {
    const repo = new InMemoryMessageRepository({ localNodeNum: LOCAL_NODE });
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

  it("keys inbound direct messages by sender peer", async () => {
    const repo = new InMemoryMessageRepository({ localNodeNum: LOCAL_NODE });
    await repo.append(directMsg(8, PEER_NODE, LOCAL_NODE));

    const out = await repo.loadRecent({ kind: "direct", peer: PEER_NODE }, 10);
    expect(out.map((m) => m.id)).toEqual([8]);
  });

  it("prune enforces maxPerBucket", async () => {
    const repo = new InMemoryMessageRepository();
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
    const repo = new InMemoryMessageRepository();
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
});
