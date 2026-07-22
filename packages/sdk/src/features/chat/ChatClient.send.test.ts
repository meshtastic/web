import { create, toBinary } from "@bufbuild/protobuf";
import type { ResultType } from "better-result";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it, vi } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";
import type { SendTextError } from "./application/SendTextUseCase.ts";
import { MessageState } from "./domain/MessageState.ts";

type SendResult = ResultType<number, SendTextError>;

/**
 * `client.chat.send` resolves only after the packet is ack'd via
 * `client.queue.processAck(id)`. The fake transport doesn't drive that
 * for us, so this helper polls the queue and acks any pending items
 * until the send promise settles.
 */
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

function sendBroadcast(client: MeshClient, text: string): Promise<SendResult> {
  return withAckFlush(client, () =>
    client.chat.send({
      text,
      destination: "broadcast",
      channel: ChannelNumber.Primary,
    }),
  );
}

describe("ChatClient.send optimistic append", () => {
  it("replaces the original message with a fresh send when retrying", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    const original = await sendBroadcast(client, "try again");
    if (original.status !== "ok") throw new Error("send failed");

    const retried = await withAckFlush(client, () =>
      client.chat.retry(original.value),
    );
    if (retried.status !== "ok") throw new Error("retry failed");

    expect(retried.value).not.toBe(original.value);
    expect(messages.value).toHaveLength(1);
    expect(messages.value[0]).toMatchObject({
      id: retried.value,
      text: "try again",
      state: MessageState.Pending,
    });
  });

  it("appends an outbound broadcast to the channel bucket immediately", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    const result = await sendBroadcast(client, "hello mesh");
    expect(result.status).toBe("ok");

    const stored = messages.value;
    expect(stored).toHaveLength(1);
    const msg = stored[0]!;
    expect(msg.text).toBe("hello mesh");
    expect(msg.type).toBe("broadcast");
    expect(msg.state).toBe(MessageState.Pending);
    if (result.status === "ok") expect(msg.id).toBe(result.value);
  });

  it("appends an outbound direct message to the direct bucket", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const peer = 12345;
    const direct = client.chat.direct(peer);

    const result: SendResult = await withAckFlush(client, () =>
      client.chat.send({ text: "hi peer", destination: peer }),
    );
    expect(result.status).toBe("ok");

    const stored = direct.value;
    expect(stored).toHaveLength(1);
    expect(stored[0]!.type).toBe("direct");
    expect(stored[0]!.to).toBe(peer);
    expect(stored[0]!.text).toBe("hi peer");
  });

  it("does not double-append when an inbound packet echoes the same id", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    const result = await sendBroadcast(client, "echoed");
    if (result.status !== "ok") throw new Error("unreachable");

    // Simulate firmware looping the same packet back via fromradio.
    client.events.onMessagePacket.dispatch({
      id: result.value,
      from: client.myNodeNum,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(),
      data: "echoed",
    } as never);

    expect(messages.value).toHaveLength(1);
  });

  it("appends the optimistic message before the send promise resolves", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    // Kick off the send but do NOT await yet.
    const sendPromise = client.chat.send({
      text: "instant",
      destination: "broadcast",
      channel: ChannelNumber.Primary,
    });

    // Synchronously, the message must already be in the bucket — the
    // optimistic append runs before any await in send().
    expect(messages.value).toHaveLength(1);
    expect(messages.value[0]!.text).toBe("instant");
    expect(messages.value[0]!.state).toBe(MessageState.Pending);

    // Now drain the queue so the test doesn't dangle.
    for (const item of client.queue.getState())
      client.queue.processAck(item.id);
    await sendPromise;
  });

  it("flips outbound state to Failed when sendText returns Err", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    // Empty text triggers EmptyMessageError synchronously inside sendText.
    const result = await client.chat.send({
      text: "",
      destination: "broadcast",
      channel: ChannelNumber.Primary,
    });
    expect(result.status).toBe("error");
    // Empty-text path errors before the optimistic append runs in the
    // current implementation? It actually appends first — so the bucket
    // should contain the placeholder with state=Failed.
    expect(messages.value).toHaveLength(1);
    expect(messages.value[0]!.state).toBe(MessageState.Failed);
  });

  it("flips outbound channel state to Ack on a routing-error=NONE packet matching the request id", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    const result = await sendBroadcast(client, "ack me");
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 987,
      requestId: result.value,
      from: 0,
      to: 0,
      channel: 0,
      type: "broadcast",
      rxTime: new Date(),
      data: {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.NONE,
        },
      },
    } as never);

    expect(messages.value[0]!.state).toBe(MessageState.Ack);
  });

  it("marks direct NONE from a relayer as relayed instead of recipient-delivered", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const peer = 12345;
    const direct = client.chat.direct(peer);

    const result: SendResult = await withAckFlush(client, () =>
      client.chat.send({ text: "hi peer", destination: peer }),
    );
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 456,
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

    expect(direct.value[0]!.state).toBe(MessageState.Relayed);
  });

  it("marks direct NONE from the recipient as recipient-delivered", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const peer = 12345;
    const direct = client.chat.direct(peer);

    const result: SendResult = await withAckFlush(client, () =>
      client.chat.send({ text: "hi peer", destination: peer }),
    );
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 789,
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

    expect(direct.value[0]!.state).toBe(MessageState.Ack);
  });

  it("does not downgrade recipient-delivered direct messages on later relayer confirmations", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const peer = 12345;
    const direct = client.chat.direct(peer);

    const result: SendResult = await withAckFlush(client, () =>
      client.chat.send({ text: "hi peer", destination: peer }),
    );
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 789,
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
    client.events.onRoutingPacket.dispatch({
      id: 790,
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

    expect(direct.value[0]!.state).toBe(MessageState.Ack);
  });

  it("promotes relayed direct messages to failed on later PKI errors", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const peer = 12345;
    const direct = client.chat.direct(peer);

    const result: SendResult = await withAckFlush(client, () =>
      client.chat.send({ text: "needs key", destination: peer }),
    );
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 791,
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
    client.events.onRoutingPacket.dispatch({
      id: 792,
      requestId: result.value,
      from: peer,
      to: client.myNodeNum,
      channel: 0,
      type: "direct",
      rxTime: new Date(),
      data: {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY,
        },
      },
    } as never);

    expect(direct.value[0]!.state).toBe(MessageState.Failed);
    expect(direct.value[0]!.routingError).toBe(
      Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY,
    );
  });

  it("preserves recipient-delivered direct messages on later PKI errors", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const peer = 12345;
    const direct = client.chat.direct(peer);

    const result: SendResult = await withAckFlush(client, () =>
      client.chat.send({ text: "already acked", destination: peer }),
    );
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 793,
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
    client.events.onRoutingPacket.dispatch({
      id: 794,
      requestId: result.value,
      from: peer,
      to: client.myNodeNum,
      channel: 0,
      type: "direct",
      rxTime: new Date(),
      data: {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.PKI_SEND_FAIL_PUBLIC_KEY,
        },
      },
    } as never);

    expect(direct.value[0]!.state).toBe(MessageState.Ack);
    expect(direct.value[0]!.routingError).toBeUndefined();
  });

  it("preserves routing error reason on failed delivery", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    const result = await sendBroadcast(client, "no ack");
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 321,
      requestId: result.value,
      from: 0,
      to: 0,
      channel: 0,
      type: "broadcast",
      rxTime: new Date(),
      data: {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
        },
      },
    } as never);

    expect(messages.value[0]!.state).toBe(MessageState.Failed);
    expect(messages.value[0]!.routingError).toBe(
      Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
    );
  });

  it("preserves routing error when decoder rejects the queued send afterward", async () => {
    const { transport, respond } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const sendPromise = client.chat.send({
        text: "missing channel",
        destination: "broadcast",
        channel: ChannelNumber.Primary,
      });
      const packetId = messages.value[0]?.id;
      if (packetId === undefined) {
        throw new Error("optimistic message was not appended");
      }
      const queued = client.queue
        .getState()
        .find((item) => item.id === packetId);
      if (queued === undefined) {
        throw new Error("send was not queued");
      }
      void queued.promise.catch(() => {});

      const routingPacket = create(Protobuf.Mesh.RoutingSchema, {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.NO_CHANNEL,
        },
      });
      respond.withMeshPacket(
        create(Protobuf.Mesh.MeshPacketSchema, {
          id: 654,
          from: 0,
          to: client.myNodeNum,
          channel: ChannelNumber.Primary,
          rxTime: Math.trunc(Date.now() / 1000),
          payloadVariant: {
            case: "decoded",
            value: {
              portnum: Protobuf.Portnums.PortNum.ROUTING_APP,
              requestId: packetId,
              payload: toBinary(Protobuf.Mesh.RoutingSchema, routingPacket),
            },
          },
        }),
      );

      const result = await sendPromise;
      expect(result.status).toBe("error");
      expect(messages.value).toHaveLength(1);
      expect(messages.value[0]!.state).toBe(MessageState.Failed);
      expect(messages.value[0]!.routingError).toBe(
        Protobuf.Mesh.Routing_Error.NO_CHANNEL,
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
