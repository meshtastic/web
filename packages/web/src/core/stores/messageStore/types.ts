import type { MessageState, MessageType } from "@core/stores";
import type { Types } from "@meshtastic/core";

type NodeNum = number;
type MessageId = number;
type ChannelId = Types.ChannelNumber;
type ConversationId = string;
type MessageLogMap = Map<MessageId, Message>;

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

type Message =
  | GenericMessage<MessageType.Direct>
  | GenericMessage<MessageType.Broadcast>;

type GetMessagesParams =
  | { type: MessageType.Direct; nodeA: NodeNum; nodeB: NodeNum }
  | { type: MessageType.Broadcast; channelId: ChannelId };

type SetMessageStateParams =
  | {
      type: MessageType.Direct;
      nodeA: NodeNum;
      nodeB: NodeNum;
      messageId: MessageId; // ID of the message within that chat
      newState?: MessageState; // Optional new state, defaults to Ack
    }
  | {
      type: MessageType.Broadcast;
      channelId: ChannelId;
      messageId: MessageId;
      newState?: MessageState; // Optional new state, defaults to Ack
    };

type ClearMessageParams =
  | {
      type: MessageType.Direct;
      nodeA: NodeNum;
      nodeB: NodeNum;
      messageId: MessageId;
    }
  | {
      type: MessageType.Broadcast;
      channelId: ChannelId;
      messageId: MessageId;
    };

export type {
  ChannelId,
  ClearMessageParams,
  ConversationId,
  GetMessagesParams,
  Message,
  MessageId,
  MessageLogMap,
  NodeNum,
  SetMessageStateParams,
};
