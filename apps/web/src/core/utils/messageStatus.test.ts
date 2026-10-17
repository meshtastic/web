import { MessageState } from "@core/stores/messageStore";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { messageStatus } from "./messageStatus.ts";

const E = Protobuf.Mesh.Routing_Error;
const Proof = Protobuf.Mesh.MeshPacket_AckProofStatus;

describe("messageStatus", () => {
  it("shows a pending message as sending", () => {
    expect(messageStatus({ state: MessageState.Waiting }, false)).toMatchObject(
      { textKey: "enroute", tone: "pending", retryable: false },
    );
  });

  it("treats a mesh ack as success for a broadcast", () => {
    expect(
      messageStatus({ state: MessageState.Delivered }, false),
    ).toMatchObject({
      textKey: "delivered",
      tone: "success",
      retryable: false,
    });
  });

  it("warns that a direct message was only relayed, and offers resend", () => {
    expect(
      messageStatus({ state: MessageState.Delivered }, true),
    ).toMatchObject({
      textKey: "relayedNotConfirmed",
      tone: "warning",
      retryable: true,
    });
  });

  it("marks recipient delivery, and proven delivery", () => {
    expect(messageStatus({ state: MessageState.Ack }, true).textKey).toBe(
      "recipientDelivered",
    );
    expect(
      messageStatus(
        { state: MessageState.Ack, ackProof: Proof.ACK_PROOF_VALID },
        true,
      ),
    ).toMatchObject({
      textKey: "recipientDeliveredProven",
      proofKey: "verified",
    });
  });

  it("lets a forged ack override the delivered text", () => {
    expect(
      messageStatus(
        { state: MessageState.Ack, ackProof: Proof.ACK_PROOF_INVALID },
        true,
      ),
    ).toMatchObject({
      textKey: "ackProofInvalid",
      proofKey: "failed",
      tone: "warning",
    });
  });

  it("names the failure and its detail, and offers resend", () => {
    expect(
      messageStatus(
        { state: MessageState.Failed, routingError: E.MAX_RETRANSMIT },
        true,
      ),
    ).toMatchObject({
      textKey: "error.maxRetransmit",
      detailKey: "maxRetransmit",
      titleKey: "errorTitle",
      tone: "warning",
      retryable: true,
    });
    expect(
      messageStatus(
        { state: MessageState.Failed, routingError: E.TIMEOUT },
        true,
      ),
    ).toMatchObject({ textKey: "error.maxRetransmit", detailKey: "timeout" });
  });

  it("does not offer resend when it can't help", () => {
    for (const routingError of [E.NO_CHANNEL, E.TOO_LARGE]) {
      expect(
        messageStatus({ state: MessageState.Failed, routingError }, false),
      ).toMatchObject({ tone: "error", retryable: false });
    }
  });

  it("still describes a local failure with no routing error", () => {
    expect(messageStatus({ state: MessageState.Failed }, false)).toMatchObject({
      textKey: "error.unknownError",
      titleKey: "title",
      retryable: true,
    });
  });
});
