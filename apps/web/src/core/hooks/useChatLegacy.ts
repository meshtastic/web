import { MessageState as LegacyMessageState, MessageType } from "@core/stores";
import type { Message as LegacyMessage } from "@core/stores/messageStore/types.ts";
import type { Message as SdkMessage } from "@meshtastic/sdk";
import { MessageState as SdkMessageState, type Types } from "@meshtastic/sdk";
import { useChat, useDirectChat } from "@meshtastic/sdk-react";
import { useMemo } from "react";

/**
 * Adapter that surfaces SDK-managed chat history in the shape expected by
 * legacy Zustand-era components (`Message` from `messageStore/types.ts`).
 *
 * Lets MessagesPage / ChannelChat / MessageItem keep their current props
 * while reading from the OPFS-backed SQLite repository through the SDK chat
 * slice. Drafts and unread counts continue to live in Zustand.
 */
export interface UseChatLegacyBroadcast {
  type: MessageType.Broadcast;
  channelId: Types.ChannelNumber;
}

export interface UseChatLegacyDirect {
  type: MessageType.Direct;
  peer: number;
}

export type UseChatLegacyParams = UseChatLegacyBroadcast | UseChatLegacyDirect;

export function useChatLegacy(params: UseChatLegacyParams): LegacyMessage[] {
  const broadcast = useChat(
    params.type === MessageType.Broadcast ? params.channelId : (0 as Types.ChannelNumber),
  );
  const direct = useDirectChat(params.type === MessageType.Direct ? params.peer : 0);
  const sdkMessages = params.type === MessageType.Broadcast ? broadcast.messages : direct.messages;

  return useMemo(() => sdkMessages.map((m) => toLegacy(m, params)), [sdkMessages, params]);
}

function toLegacy(message: SdkMessage, params: UseChatLegacyParams): LegacyMessage {
  return {
    type: params.type,
    channel: message.channel,
    to: message.to,
    from: message.from,
    date: message.rxTime.getTime(),
    messageId: message.id,
    state: mapState(message.state),
    message: message.text,
  } as LegacyMessage;
}

function mapState(state: SdkMessageState): LegacyMessageState {
  switch (state) {
    case SdkMessageState.Ack:
      return LegacyMessageState.Ack;
    case SdkMessageState.Failed:
      return LegacyMessageState.Failed;
    case SdkMessageState.Pending:
    default:
      return LegacyMessageState.Waiting;
  }
}
