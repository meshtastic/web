import { Protobuf } from "@core/protobuf.ts";
import { MessageState } from "@core/storage/types.ts";
import { describe, expect, it } from "vitest";
import {
  type Deliverable,
  reduceAck,
  reduceSendOutcome,
  routingErrorFromReason,
  toReactionPatch,
} from "./delivery.ts";

const PEER = 7;
const NONE = Protobuf.Mesh.Routing_Error.NONE;
const Proof = Protobuf.Mesh.MeshPacket_AckProofStatus;
const pending: Deliverable = { state: MessageState.Pending, to: PEER };

describe("reduceAck", () => {
  it("records the relay an ack came back through, and replaces it on the next", () => {
    expect(
      reduceAck(pending, { from: 9, error: NONE, relayNode: 0x5a }),
    ).toEqual({ state: MessageState.Delivered, relays: 1, relayNode: 0x5a });
    expect(
      reduceAck(
        {
          ...pending,
          state: MessageState.Delivered,
          relays: 1,
          relayNode: 0x5a,
        },
        { from: PEER, error: NONE },
      ),
    ).toEqual({ state: MessageState.Ack, relays: 2, relayNode: undefined });
  });

  it("keeps the relay once the recipient has acked", () => {
    expect(
      reduceAck(
        { ...pending, state: MessageState.Ack, relayNode: 0x5a },
        { from: 9, error: NONE, relayNode: 0x77 },
      ),
    ).toEqual({});
  });

  it("an ack from the recipient acks the message", () => {
    expect(reduceAck(pending, { from: PEER, error: NONE })).toEqual({
      state: MessageState.Ack,
      relays: 1,
    });
  });

  it("an ack from a relay delivers it and counts the relay", () => {
    expect(
      reduceAck(
        { ...pending, state: MessageState.Delivered, relays: 2 },
        { from: 9, error: NONE },
      ),
    ).toEqual({ state: MessageState.Delivered, relays: 3 });
  });

  it("clears an earlier routing error on success", () => {
    expect(
      reduceAck(
        { ...pending, state: MessageState.Failed, routingError: 3 },
        { from: 9, error: NONE },
      ),
    ).toEqual({
      state: MessageState.Delivered,
      relays: 1,
      routingError: undefined,
    });
  });

  it("a NAK fails it with the error", () => {
    const error = Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT;
    expect(reduceAck(pending, { from: 9, error })).toEqual({
      state: MessageState.Failed,
      routingError: error,
    });
  });

  it("leaves an acked message's state alone", () => {
    expect(
      reduceAck(
        { ...pending, state: MessageState.Ack },
        { from: 9, error: Protobuf.Mesh.Routing_Error.TIMEOUT },
      ),
    ).toEqual({});
  });

  it("only ever upgrades the proof of delivery", () => {
    const acked = { ...pending, state: MessageState.Ack };
    expect(
      reduceAck(acked, {
        from: PEER,
        error: NONE,
        proof: Proof.ACK_PROOF_ABSENT,
      }),
    ).toEqual({});
    expect(
      reduceAck(
        { ...acked, ackProof: Proof.ACK_PROOF_INVALID },
        { from: PEER, error: NONE, proof: Proof.ACK_PROOF_VALID },
      ),
    ).toEqual({ ackProof: Proof.ACK_PROOF_VALID });
    expect(
      reduceAck(
        { ...acked, ackProof: Proof.ACK_PROOF_VALID },
        { from: PEER, error: NONE, proof: Proof.ACK_PROOF_INVALID },
      ),
    ).toEqual({});
  });
});

describe("reduceSendOutcome", () => {
  it("success settles only a pending message", () => {
    expect(reduceSendOutcome(pending, { ok: true })).toEqual({
      state: MessageState.Delivered,
    });
    expect(
      reduceSendOutcome({ state: MessageState.Ack }, { ok: true }),
    ).toEqual({});
  });

  it("failure fails anything not acked", () => {
    expect(
      reduceSendOutcome(
        { state: MessageState.Delivered },
        { ok: false, routingError: 6 },
      ),
    ).toEqual({ state: MessageState.Failed, routingError: 6 });
    expect(reduceSendOutcome(pending, { ok: false })).toEqual({
      state: MessageState.Failed,
    });
    expect(
      reduceSendOutcome({ state: MessageState.Ack }, { ok: false }),
    ).toEqual({});
  });
});

describe("routingErrorFromReason", () => {
  it("maps Routing_Error names and nothing else", () => {
    expect(routingErrorFromReason("NO_CHANNEL")).toBe(
      Protobuf.Mesh.Routing_Error.NO_CHANNEL,
    );
    expect(routingErrorFromReason("socket closed")).toBeUndefined();
  });
});

describe("toReactionPatch", () => {
  it("keeps state and routing error, including a cleared one", () => {
    expect(
      toReactionPatch({
        state: MessageState.Delivered,
        relays: 2,
        routingError: undefined,
        ackProof: Proof.ACK_PROOF_VALID,
      }),
    ).toEqual({ state: MessageState.Delivered, routingError: undefined });
    expect("routingError" in toReactionPatch({ relays: 1 })).toBe(false);
    expect(toReactionPatch({})).toEqual({});
  });
});
