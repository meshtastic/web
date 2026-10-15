import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { ResultType } from "better-result";
import { describe, expect, it } from "vitest";
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

  it("marks a broadcast Delivered when the mesh acks it", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    const result = await sendBroadcast(client, "ack me");
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: result.value,
      from: 0,
      to: 0,
      channel: 0,
      type: "broadcast",
      rxTime: new Date(),
      data: { variant: { case: "errorReason", value: 0 } },
    } as never);

    expect(messages.value[0]!.state).toBe(MessageState.Delivered);
  });

  it("matches a routing ack to the message by request_id", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);

    const result = await sendBroadcast(client, "ack me");
    if (result.status !== "ok") throw new Error("send failed");

    client.events.onRoutingPacket.dispatch({
      id: 123456,
      requestId: result.value,
      from: 5,
      to: 0,
      channel: 0,
      type: "direct",
      rxTime: new Date(),
      data: create(Protobuf.Mesh.RoutingSchema, {
        variant: {
          case: "errorReason",
          value: Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT,
        },
      }),
    });

    expect(messages.value[0]!.state).toBe(MessageState.Failed);
  });

  it("keeps the strongest ack proof verdict", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const messages = client.chat.messages(ChannelNumber.Primary);
    const Proof = Protobuf.Mesh.MeshPacket_AckProofStatus;

    const result = await sendBroadcast(client, "prove it");
    if (result.status !== "ok") throw new Error("send failed");
    const ack = (ackProofStatus: Protobuf.Mesh.MeshPacket_AckProofStatus) =>
      client.events.onRoutingPacket.dispatch({
        id: Math.floor(Math.random() * 1e6),
        requestId: result.value,
        from: 5,
        to: 0,
        channel: 0,
        type: "direct",
        rxTime: new Date(),
        ackProofStatus,
        data: create(Protobuf.Mesh.RoutingSchema, {
          variant: { case: "errorReason", value: 0 },
        }),
      });

    ack(Proof.ACK_PROOF_INVALID);
    expect(messages.value[0]!.ackProof).toBe(Proof.ACK_PROOF_INVALID);
    ack(Proof.ACK_PROOF_ABSENT);
    expect(messages.value[0]!.ackProof).toBe(Proof.ACK_PROOF_INVALID);
    ack(Proof.ACK_PROOF_VALID);
    expect(messages.value[0]!.ackProof).toBe(Proof.ACK_PROOF_VALID);
    ack(Proof.ACK_PROOF_INVALID);
    expect(messages.value[0]!.ackProof).toBe(Proof.ACK_PROOF_VALID);
  });

  describe("direct message delivery", () => {
    async function sentDirect() {
      const { transport } = createFakeTransport();
      const client = new MeshClient({ transport });
      const messages = client.chat.direct(42);
      const result = await withAckFlush(client, () =>
        client.chat.send({ text: "hi", destination: 42 }),
      );
      if (result.status !== "ok") throw new Error("send failed");
      const route = (from: number, error: Protobuf.Mesh.Routing_Error) =>
        client.events.onRoutingPacket.dispatch({
          id: Math.floor(Math.random() * 1e6) + 1,
          requestId: result.value,
          from,
          to: 0,
          channel: 0,
          type: "direct",
          rxTime: new Date(),
          data: create(Protobuf.Mesh.RoutingSchema, {
            variant: { case: "errorReason", value: error },
          }),
        });
      return { client, messages, route };
    }
    const E = Protobuf.Mesh.Routing_Error;

    it("is Delivered when a relay acks and Ack when the recipient does", async () => {
      const { messages, route } = await sentDirect();
      route(7, E.NONE);
      expect(messages.value[0]!.state).toBe(MessageState.Delivered);
      expect(messages.value[0]!.relays).toBe(1);
      route(42, E.NONE);
      expect(messages.value[0]!.state).toBe(MessageState.Ack);
      expect(messages.value[0]!.relays).toBe(2);
    });

    it("records why it failed, but never undoes the recipient's ack", async () => {
      const { messages, route } = await sentDirect();
      route(7, E.MAX_RETRANSMIT);
      expect(messages.value[0]!.state).toBe(MessageState.Failed);
      expect(messages.value[0]!.routingError).toBe(E.MAX_RETRANSMIT);
      route(42, E.NONE);
      expect(messages.value[0]!.state).toBe(MessageState.Ack);
      expect(messages.value[0]!.routingError).toBeUndefined();
      route(7, E.NO_ROUTE);
      expect(messages.value[0]!.state).toBe(MessageState.Ack);
    });

    it("resends as a new message with a fresh id", async () => {
      const { client, messages, route } = await sentDirect();
      route(7, E.MAX_RETRANSMIT);
      const failed = messages.value[0]!;
      const result = await withAckFlush(client, () =>
        client.chat.resend(failed),
      );
      expect(result.status).toBe("ok");
      expect(messages.value).toHaveLength(1);
      expect(messages.value[0]!.id).not.toBe(failed.id);
      expect(messages.value[0]!.text).toBe("hi");
    });
  });
});
