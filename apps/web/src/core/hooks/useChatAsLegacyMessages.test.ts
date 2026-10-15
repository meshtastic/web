import { MessageState, MessageType } from "@core/stores/messageStore";
import {
  type Message as SdkMessage,
  MessageState as SdkMessageState,
  Protobuf,
  type Types,
} from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { toLegacy } from "./useChatAsLegacyMessages.ts";

const params = {
  type: MessageType.Direct as const,
  peer: 2,
};

const sdkMessage: SdkMessage = {
  id: 42,
  from: 1,
  to: 2,
  channel: 0 as Types.ChannelNumber,
  rxTime: new Date(1_700_000_000_000),
  type: "direct",
  text: "hello",
  state: SdkMessageState.Ack,
};

describe("toLegacy", () => {
  it("maps the base fields", () => {
    const legacy = toLegacy(sdkMessage, params);
    expect(legacy).toMatchObject({
      type: MessageType.Direct,
      messageId: 42,
      from: 1,
      to: 2,
      date: 1_700_000_000_000,
      message: "hello",
      state: MessageState.Ack,
    });
    expect(legacy.signed).toBeUndefined();
    expect(legacy.ackProof).toBeUndefined();
  });

  it("carries signed and ackProof through", () => {
    const legacy = toLegacy(
      {
        ...sdkMessage,
        signed: true,
        ackProof: Protobuf.Mesh.MeshPacket_AckProofStatus.ACK_PROOF_INVALID,
      },
      params,
    );
    expect(legacy.signed).toBe(true);
    expect(legacy.ackProof).toBe(
      Protobuf.Mesh.MeshPacket_AckProofStatus.ACK_PROOF_INVALID,
    );
  });

  it("carries the delivery state, failure reason and relay count", () => {
    const legacy = toLegacy(
      {
        ...sdkMessage,
        state: SdkMessageState.Delivered,
        routingError: Protobuf.Mesh.Routing_Error.NO_ROUTE,
        relays: 3,
      },
      params,
    );
    expect(legacy.state).toBe(MessageState.Delivered);
    expect(legacy.routingError).toBe(Protobuf.Mesh.Routing_Error.NO_ROUTE);
    expect(legacy.relays).toBe(3);
  });
});
