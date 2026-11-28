import { Protobuf } from "@core/protobuf.ts";
import {
  type Message,
  type MessageDeliveryPatch,
  MessageState,
  type ReactionDeliveryPatch,
} from "@core/storage/types.ts";

/** One routing ack or NAK, as the radio reported it. */
export interface RoutingAck {
  readonly from: number;
  readonly error: Protobuf.Mesh.Routing_Error;
  readonly proof?: Protobuf.Mesh.MeshPacket_AckProofStatus;
  /** Relay byte of the ack, already cleared when it names no relay. */
  readonly relayNode?: number;
}

export type Deliverable = Pick<
  Message,
  "state" | "to" | "relays" | "ackProof" | "routingError" | "relayNode"
>;

/**
 * Folds one ack or NAK into an outgoing message or reaction, as the Android
 * app's handleAckNak does. An ack from the addressed node means the
 * recipient got it (Ack); one from anyone else means it reached the mesh
 * (Delivered) and counts as a relay. A NAK fails it. Once the recipient has
 * acked, later acks and NAKs no longer change the state. A proof of delivery
 * only ever upgrades (absent < invalid < valid). Each ack or NAK that
 * changes the state also replaces the relay it came back through, as on
 * Android.
 */
export const reduceAck = (
  current: Deliverable,
  ack: RoutingAck,
): MessageDeliveryPatch => {
  const patch: MessageDeliveryPatch = {};
  if (current.state !== MessageState.Ack) {
    if (ack.error === Protobuf.Mesh.Routing_Error.NONE) {
      patch.state =
        ack.from === current.to ? MessageState.Ack : MessageState.Delivered;
      patch.relays = (current.relays ?? 0) + 1;
      if (current.routingError !== undefined) patch.routingError = undefined;
    } else {
      patch.state = MessageState.Failed;
      patch.routingError = ack.error;
    }
    if (ack.relayNode !== current.relayNode) patch.relayNode = ack.relayNode;
  }
  const Proof = Protobuf.Mesh.MeshPacket_AckProofStatus;
  const proof = ack.proof;
  const held = current.ackProof;
  if (
    proof !== undefined &&
    proof !== Proof.ACK_PROOF_ABSENT &&
    held !== Proof.ACK_PROOF_VALID &&
    (held !== Proof.ACK_PROOF_INVALID || proof === Proof.ACK_PROOF_VALID)
  ) {
    patch.ackProof = proof;
  }
  return patch;
};

export type SendOutcome =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly routingError?: Protobuf.Mesh.Routing_Error;
    };

/**
 * What the SDK's final verdict on a send changes. Success only settles a
 * message still pending (an ack may already have upgraded it); failure
 * fails anything the recipient hasn't acked.
 */
export const reduceSendOutcome = (
  current: Pick<Message, "state">,
  outcome: SendOutcome,
): MessageDeliveryPatch => {
  if (outcome.ok) {
    return current.state === MessageState.Pending
      ? { state: MessageState.Delivered }
      : {};
  }
  if (current.state === MessageState.Ack) return {};
  return outcome.routingError === undefined
    ? { state: MessageState.Failed }
    : { state: MessageState.Failed, routingError: outcome.routingError };
};

const ROUTING_ERROR_BY_REASON: ReadonlyMap<
  string,
  Protobuf.Mesh.Routing_Error
> = new Map(
  Object.entries(Protobuf.Mesh.Routing_Error).flatMap(([name, value]) =>
    typeof value === "number" ? [[name, value]] : [],
  ),
);

/** The routing error the SDK names in a failed send's reason, if any. */
export const routingErrorFromReason = (
  reason: string,
): Protobuf.Mesh.Routing_Error | undefined =>
  ROUTING_ERROR_BY_REASON.get(reason);

export const isEmptyPatch = (patch: object): boolean =>
  Object.keys(patch).length === 0;

/**
 * The part of a message delivery patch a reaction keeps: its state and
 * routing error (reactions count no relays and carry no proof).
 */
export const toReactionPatch = (
  patch: MessageDeliveryPatch,
): ReactionDeliveryPatch => ({
  ...(patch.state === undefined ? {} : { state: patch.state }),
  ...("routingError" in patch ? { routingError: patch.routingError } : {}),
});
