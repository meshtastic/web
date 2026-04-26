/**
 * Legacy enums and message-shape types preserved for components that still
 * read from the SDK chat slice via the `useChatAsLegacyMessages` adapter. The Zustand
 * messageStore that previously lived here has been retired — chat
 * persistence is owned by the SDK ChatClient + SqlocalMessageRepository.
 */

import type { Types } from "@meshtastic/sdk";

export enum MessageState {
  Ack = "ack",
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
}

interface GenericMessage<T extends MessageType> extends MessageBase {
  type: T;
}

export type Message = GenericMessage<MessageType.Direct> | GenericMessage<MessageType.Broadcast>;

export function getConversationId(node1: NodeNum, node2: NodeNum): ConversationId {
  return [node1, node2].sort((a, b) => a - b).join(":");
}
