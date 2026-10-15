/**
 * Legacy enums and message-shape types preserved for components that still
 * read from the SDK chat slice via the `useChatAsLegacyMessages` adapter. The Zustand
 * messageStore that previously lived here has been retired — chat
 * persistence is owned by the SDK ChatClient + SqlocalMessageRepository.
 */

import type { Protobuf, Types } from "@meshtastic/sdk";

export enum MessageState {
  /** The addressed node acked it (and every inbound message). */
  Ack = "ack",
  /** Acked by a relay, or heard rebroadcast: on the mesh, not confirmed. */
  Delivered = "delivered",
  Waiting = "waiting",
  Failed = "failed",
}

export enum MessageType {
  Direct = "direct",
  Broadcast = "broadcast",
}

export type NodeNum = number;
export type MessageId = number;
export type ChannelId = Types.ChannelNumber;
export type ConversationId = string;

interface MessageBase {
  channel: Types.ChannelNumber;
  to: number;
  from: number;
  date: number;
  messageId: number;
  state: MessageState;
  message: string;
  /** Received with an XEdDSA signature the device verified. */
  signed?: boolean;
  /** Proof-of-delivery verdict from the ack of an outbound message. */
  ackProof?: Protobuf.Mesh.MeshPacket_AckProofStatus;
  /** Why an outbound message failed. */
  routingError?: Protobuf.Mesh.Routing_Error;
  /** How many acks (relays and the recipient) came back. */
  relays?: number;
}

interface GenericMessage<T extends MessageType> extends MessageBase {
  type: T;
}

export type Message =
  | GenericMessage<MessageType.Direct>
  | GenericMessage<MessageType.Broadcast>;

export function getConversationId(
  node1: NodeNum,
  node2: NodeNum,
): ConversationId {
  return [node1, node2].sort((a, b) => a - b).join(":");
}
