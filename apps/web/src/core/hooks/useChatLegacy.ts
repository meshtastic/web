import {
  type Message as LegacyMessage,
  MessageType,
} from "@core/stores/messageStore";
import type { Types } from "@meshtastic/sdk";
import { useChat, useDirectChat } from "@meshtastic/sdk-react";
import { useMemo } from "react";
import { toLegacy } from "./useChatAsLegacyMessages.ts";

/**
 * Adapter that surfaces SDK-managed chat history in the shape expected by
 * the pre-SDK message components (`Message` from `messageStore`). Lets
 * MessagesPage / ChannelChat / MessageItem keep their current props while
 * reading from the OPFS-backed SQLite repository through the SDK chat
 * slice. Removed once those components consume `Message` from the SDK
 * directly.
 */
export interface UseChatAsLegacyMessagesBroadcast {
  type: MessageType.Broadcast;
  channelId: Types.ChannelNumber;
}

export interface UseChatAsLegacyMessagesDirect {
  type: MessageType.Direct;
  peer: number;
}

export type UseChatAsLegacyMessagesParams =
  | UseChatAsLegacyMessagesBroadcast
  | UseChatAsLegacyMessagesDirect;

export function useChatAsLegacyMessages(
  params: UseChatAsLegacyMessagesParams,
): LegacyMessage[] {
  const broadcast = useChat(
    params.type === MessageType.Broadcast
      ? params.channelId
      : (0 as Types.ChannelNumber),
  );
  const direct = useDirectChat(
    params.type === MessageType.Direct ? params.peer : 0,
  );
  const sdkMessages =
    params.type === MessageType.Broadcast
      ? broadcast.messages
      : direct.messages;

  return useMemo(
    () => sdkMessages.map((m) => toLegacy(m, params)),
    [sdkMessages, params],
  );
}
