import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";
import { InMemoryMessageRepository } from "./infrastructure/repositories/InMemoryMessageRepository.ts";
import type { Message } from "./domain/Message.ts";
import type { ConversationKey } from "./domain/MessageRepository.ts";
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

class DeferredAppendRepository extends InMemoryMessageRepository {
  private releaseAppend: (() => void) | undefined;

  override async append(
    message: Message,
    key?: ConversationKey,
  ): Promise<void> {
    await new Promise<void>((resolve) => {
      this.releaseAppend = resolve;
    });
    await super.append(message, key);
  }

  releasePendingAppend(): void {
    this.releaseAppend?.();
  }
}

class DelayedFirstUpdateRepository extends InMemoryMessageRepository {
  private updateCount = 0;
  private firstUpdateStarted: (() => void) | undefined;
  private releaseFirstUpdate: (() => void) | undefined;

  readonly firstUpdateStartedPromise = new Promise<void>((resolve) => {
    this.firstUpdateStarted = resolve;
  });

  override async updateState(
    id: number,
    state: MessageState,
    routingError?: Protobuf.Mesh.Routing_Error,
  ): Promise<void> {
    this.updateCount += 1;
    if (this.updateCount === 1) {
      this.firstUpdateStarted?.();
      await new Promise<void>((resolve) => {
        this.releaseFirstUpdate = resolve;
      });
    }
    await super.updateState(id, state, routingError);
  }

  releaseDelayedUpdate(): void {
    this.releaseFirstUpdate?.();
  }
}

async function withAckFlush<T>(
  client: MeshClient,
  run: () => Promise<T>,
): Promise<T> {
  const flush = setInterval(() => {
    for (const item of client.queue.getState())
      client.queue.processAck(item.id);
  }, 5);
  try {
    return await run();
  } finally {
    clearInterval(flush);
  }
}

async function waitForPersistedState(
  repository: InMemoryMessageRepository,
  key: ConversationKey,
  state: MessageState,
): Promise<Message> {
  for (let i = 0; i < 20; i++) {
    const [persisted] = await repository.loadRecent(key, 1);
    if (persisted?.state === state) return persisted;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for persisted state ${state}`);
}

describe("ChatClient persistence", () => {
  it("hydrates messages from the repository on first subscription", async () => {
    const repository = new InMemoryMessageRepository();
    await repository.appendBatch([
      seedMessage(1, 1000, "first"),
      seedMessage(2, 2000, "second"),
    ]);

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
    expect(sig.value.map((m) => m.text)).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
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

  it("persists the final failed state when validation beats async append", async () => {
    const repository = new DeferredAppendRepository();
    const { transport } = createFakeTransport();
    const client = new MeshClient({
      transport,
      chat: { repository },
    });
    const conv: ConversationKey = {
      kind: "channel",
      channel: ChannelNumber.Primary,
    };

    const result = await client.chat.send({
      text: "x".repeat(229),
      destination: "broadcast",
      channel: ChannelNumber.Primary,
    });

    expect(result.status).toBe("error");
    repository.releasePendingAppend();

    const persisted = await waitForPersistedState(
      repository,
      conv,
      MessageState.Failed,
    );
    expect(persisted.routingError).toBe(Protobuf.Mesh.Routing_Error.TOO_LARGE);
  });

  it("persists recipient ack after an earlier relayed write resolves later", async () => {
    const repository = new DelayedFirstUpdateRepository();
    const { transport } = createFakeTransport();
    const client = new MeshClient({
      transport,
      chat: { repository },
    });
    const peer = 12345;
    const conv: ConversationKey = { kind: "direct", peer };
    const direct = client.chat.direct(peer);

    const result = await withAckFlush(client, () =>
      client.chat.send({ text: "ordered", destination: peer }),
    );
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 1,
      requestId: result.value,
      from: 999,
      to: client.myNodeNum,
      channel: 0,
      type: "direct",
      rxTime: new Date(),
      data: {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.NONE,
        },
      },
    } as never);
    await repository.firstUpdateStartedPromise;

    client.events.onRoutingPacket.dispatch({
      id: 2,
      requestId: result.value,
      from: peer,
      to: client.myNodeNum,
      channel: 0,
      type: "direct",
      rxTime: new Date(),
      data: {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.NONE,
        },
      },
    } as never);

    expect(direct.value[0]?.state).toBe(MessageState.Ack);

    repository.releaseDelayedUpdate();
    const persisted = await waitForPersistedState(
      repository,
      conv,
      MessageState.Ack,
    );
    expect(persisted.routingError).toBeUndefined();
  });
});
