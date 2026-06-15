import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";
import { InMemoryMessageRepository } from "./infrastructure/repositories/InMemoryMessageRepository.ts";
import type { Message } from "./domain/Message.ts";
import { MessageState } from "./domain/MessageState.ts";

function seedMessage(id: number, ms: number, text: string): Message {
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

describe("ChatClient persistence", () => {
  it("hydrates messages from the repository on first subscription", async () => {
    const repository = new InMemoryMessageRepository();
    await repository.appendBatch([seedMessage(1, 1000, "first"), seedMessage(2, 2000, "second")]);

    const { transport } = createFakeTransport();
    const client = new MeshClient({
      transport,
      chat: { repository, initialLoadLimit: 50 },
    });

    const sig = client.chat.messages(ChannelNumber.Primary);
    expect(sig.value).toEqual([]);

    await new Promise((r) => setTimeout(r, 10));
    expect(sig.value.map((m) => m.text)).toEqual(["first", "second"]);
  });

  it("loadOlder paginates older messages into the front of the bucket", async () => {
    const repository = new InMemoryMessageRepository();
    await repository.appendBatch([
      seedMessage(1, 1000, "oldest"),
      seedMessage(2, 2000, "middle"),
      seedMessage(3, 3000, "newest"),
    ]);

    const { transport } = createFakeTransport();
    const client = new MeshClient({
      transport,
      chat: { repository, initialLoadLimit: 1 },
    });

    const sig = client.chat.messages(ChannelNumber.Primary);
    await new Promise((r) => setTimeout(r, 10));
    expect(sig.value.map((m) => m.text)).toEqual(["newest"]);

    await client.chat.loadOlder(
      { kind: "channel", channel: ChannelNumber.Primary },
      new Date(3000),
      50,
    );
    expect(sig.value.map((m) => m.text)).toEqual(["oldest", "middle", "newest"]);
  });

  it("persists inbound messages through the repository", async () => {
    const repository = new InMemoryMessageRepository();
    const { transport } = createFakeTransport();
    const client = new MeshClient({
      transport,
      chat: { repository },
    });

    client.events.onMessagePacket.dispatch({
      id: 42,
      from: 7,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(),
      data: "hi",
    });

    await new Promise((r) => setTimeout(r, 10));
    const persisted = await repository.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      10,
    );
    expect(persisted.map((m) => m.text)).toEqual(["hi"]);
  });
});
