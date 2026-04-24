import { describe, expect, it } from "vitest";
import { ChannelNumber } from "../../../../core/types.ts";
import type { Message } from "../../domain/Message.ts";
import { MessageState } from "../../domain/MessageState.ts";
import { InMemoryMessageRepository } from "./InMemoryMessageRepository.ts";

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

describe("InMemoryMessageRepository", () => {
  it("loadRecent returns the tail of a bucket", async () => {
    const repo = new InMemoryMessageRepository();
    await repo.appendBatch([msg(1, 1000), msg(2, 2000), msg(3, 3000)]);
    const out = await repo.loadRecent({ kind: "channel", channel: ChannelNumber.Primary }, 2);
    expect(out.map((m) => m.id)).toEqual([2, 3]);
  });

  it("loadBefore paginates older messages", async () => {
    const repo = new InMemoryMessageRepository();
    await repo.appendBatch([msg(1, 1000), msg(2, 2000), msg(3, 3000), msg(4, 4000)]);
    const out = await repo.loadBefore(
      { kind: "channel", channel: ChannelNumber.Primary },
      new Date(3000),
      10,
    );
    expect(out.map((m) => m.id)).toEqual([1, 2]);
  });

  it("updateState mutates the matching message", async () => {
    const repo = new InMemoryMessageRepository();
    await repo.append(msg(42, 1000));
    await repo.updateState(42, MessageState.Failed);
    const [found] = await repo.loadRecent({ kind: "channel", channel: ChannelNumber.Primary }, 1);
    expect(found?.state).toBe(MessageState.Failed);
  });

  it("prune enforces maxPerBucket", async () => {
    const repo = new InMemoryMessageRepository();
    await repo.appendBatch([msg(1, 1000), msg(2, 2000), msg(3, 3000), msg(4, 4000)]);
    await repo.prune({ maxPerBucket: 2 });
    const out = await repo.loadRecent({ kind: "channel", channel: ChannelNumber.Primary }, 10);
    expect(out.map((m) => m.id)).toEqual([3, 4]);
  });

  it("prune enforces olderThanMs", async () => {
    const repo = new InMemoryMessageRepository();
    const now = Date.now();
    await repo.appendBatch([msg(1, now - 1000 * 60 * 60 * 24 * 10), msg(2, now)]);
    await repo.prune({ olderThanMs: 1000 * 60 * 60 * 24 });
    const out = await repo.loadRecent({ kind: "channel", channel: ChannelNumber.Primary }, 10);
    expect(out.map((m) => m.id)).toEqual([2]);
  });
});
