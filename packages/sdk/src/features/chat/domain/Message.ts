import type * as Protobuf from "@meshtastic/protobufs";
import type { ChannelNumber, PacketDestination } from "../../../core/types.ts";
import type { MessageState } from "./MessageState.ts";

/**
 * A text message sent or received on the mesh.
 */
export interface Message {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly channel: ChannelNumber;
  readonly rxTime: Date;
  readonly type: PacketDestination;
  readonly text: string;
  readonly state: MessageState;
  /** Received with an XEdDSA signature the device verified. */
  readonly signed?: boolean;
  /**
   * Proof-of-delivery verdict from the ack (firmware 2.8.1+). VALID means the
   * recipient provably got it; INVALID means the ack was forged.
   */
  readonly ackProof?: Protobuf.Mesh.MeshPacket_AckProofStatus;
  /** Why a Failed message failed, from the NAK or the local queue. */
  readonly routingError?: Protobuf.Mesh.Routing_Error;
  /** How many acks (relays and the recipient) came back for it. */
  readonly relays?: number;
}

/** Fields an ack or NAK can change on a stored message. */
export type MessageDeliveryPatch = {
  -readonly [
    K in "state" | "ackProof" | "routingError" | "relays"
  ]?: Message[K];
};
