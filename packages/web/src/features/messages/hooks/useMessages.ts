/**
 * Message hooks for fetching and managing messages
 */

import { messageRepo } from "@data/repositories";
import type { LastRead, Message } from "@data/schema";
import type { ConversationType } from "@data/types";
import { useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";

/**
 * Hook to fetch direct messages between two nodes
 */
export function useDirectMessages(
  myNodeNum: number,
  nodeA: number,
  nodeB: number,
  limit = 50,
) {
  const query = useMemo(
    () => messageRepo.buildDirectMessagesQuery(myNodeNum, nodeA, nodeB, limit),
    [myNodeNum, nodeA, nodeB, limit],
  );

  const { data, status } = useReactiveQuery<Message>(
    messageRepo.getClient(),
    query,
  );

  return {
    messages: data,
    isLoading: status === "pending" && data.length === 0,
  };
}

/**
 * Hook to fetch broadcast messages for a channel
 */
export function useChannelMessages(
  myNodeNum: number,
  channelId: number,
  limit = 50,
) {
  const query = useMemo(
    () => messageRepo.buildBroadcastMessagesQuery(myNodeNum, channelId, limit),
    [myNodeNum, channelId, limit],
  );

  const { data, status } = useReactiveQuery<Message>(
    messageRepo.getClient(),
    query,
  );

  return {
    messages: data,
    isLoading: status === "pending" && data.length === 0,
  };
}

/**
 * Hook to fetch all messages for a device (paginated)
 */
export function useAllMessages(myNodeNum: number, limit = 100, offset = 0) {
  const query = useMemo(
    () => messageRepo.buildAllMessagesQuery(myNodeNum, limit, offset),
    [myNodeNum, limit, offset],
  );

  const { data, status } = useReactiveQuery<Message>(
    messageRepo.getClient(),
    query,
  );

  return {
    messages: data,
    isLoading: status === "pending" && data.length === 0,
  };
}

/**
 * Hook to fetch pending messages (for retry logic)
 */
export function usePendingMessages(myNodeNum: number) {
  const query = useMemo(
    () => messageRepo.buildPendingMessagesQuery(myNodeNum),
    [myNodeNum],
  );

  const { data, status } = useReactiveQuery<Message>(
    messageRepo.getClient(),
    query,
  );

  return {
    messages: data,
    isLoading: status === "pending" && data.length === 0,
  };
}

export type Conversation = {
  type: ConversationType;
  id: number;
  lastMessage: Message | null;
  unreadCount: number;
};

/**
 * Compute unread count for a direct conversation
 * Only counts messages FROM the other party (not our own sent messages)
 */
function computeDirectUnreadCount(
  messages: Message[],
  lastReadEntries: LastRead[],
  myNodeNum: number,
  otherNodeNum: number,
): number {
  const conversationId = `${myNodeNum}:${otherNodeNum}`;
  const lastReadEntry = lastReadEntries.find(
    (lr) => lr.type === "direct" && lr.conversationId === conversationId,
  );
  const lastReadId = lastReadEntry?.messageId ?? 0;

  return messages.filter(
    (m) =>
      m.type === "direct" &&
      // Only count messages FROM the other party
      m.fromNode === otherNodeNum &&
      m.toNode === myNodeNum &&
      m.id > lastReadId,
  ).length;
}

/**
 * Compute unread count for a channel conversation
 * Only counts messages from other nodes (not our own sent messages)
 */
function computeChannelUnreadCount(
  messages: Message[],
  lastReadEntries: LastRead[],
  channelId: number,
  myNodeNum: number,
): number {
  const conversationId = channelId.toString();
  const lastReadEntry = lastReadEntries.find(
    (lr) => lr.type === "channel" && lr.conversationId === conversationId,
  );
  const lastReadId = lastReadEntry?.messageId ?? 0;

  return messages.filter(
    (m) =>
      m.type === "channel" &&
      m.channelId === channelId &&
      // Only count messages from others
      m.fromNode !== myNodeNum &&
      m.id > lastReadId,
  ).length;
}

/**
 * Hook to get conversations list (for contact sidebar)
 * Returns a list of unique conversations with their last message and unread counts
 * @param myNodeNum - The current user's node number (needed for unread count calculations)
 */
export function useConversations(myNodeNum: number) {
  // Query all direct messages
  const directQuery = useMemo(
    () => messageRepo.buildAllDirectMessagesQuery(myNodeNum),
    [myNodeNum],
  );
  const { data: directMessages } = useReactiveQuery<Message>(
    messageRepo.getClient(),
    directQuery,
  );

  // Query all channel messages
  const channelQuery = useMemo(
    () => messageRepo.buildAllChannelMessagesQuery(myNodeNum),
    [myNodeNum],
  );
  const { data: channelMessages } = useReactiveQuery<Message>(
    messageRepo.getClient(),
    channelQuery,
  );

  // Query all lastRead entries
  const lastReadQuery = useMemo(
    () => messageRepo.buildLastReadQuery(myNodeNum),
    [myNodeNum],
  );
  const { data: lastReadEntries } = useReactiveQuery<LastRead>(
    messageRepo.getClient(),
    lastReadQuery,
  );

  // Compute conversations from the reactive data
  const conversations = useMemo(() => {
    const result: Conversation[] = [];

    // Process direct conversations - find unique conversation partners
    const directConvoMap = new Map<
      number,
      { lastMessage: Message; otherNode: number }
    >();

    for (const msg of directMessages) {
      // Determine the other node from myNodeNum's perspective
      const otherNode = msg.fromNode === myNodeNum ? msg.toNode : msg.fromNode;

      // Only keep the first (latest) message for each conversation partner
      if (!directConvoMap.has(otherNode)) {
        directConvoMap.set(otherNode, { lastMessage: msg, otherNode });
      }
    }

    // Add direct conversations to result
    for (const [otherNode, { lastMessage }] of directConvoMap) {
      const unreadCount = computeDirectUnreadCount(
        directMessages,
        lastReadEntries,
        myNodeNum,
        otherNode,
      );
      result.push({
        type: "direct",
        id: otherNode,
        lastMessage,
        unreadCount,
      });
    }

    // Process channel conversations - find unique channels
    const channelConvoMap = new Map<number, Message>();

    for (const msg of channelMessages) {
      // Skip messages with no channelId, only keep the first (latest) message for each channel
      if (msg.channelId != null && !channelConvoMap.has(msg.channelId)) {
        channelConvoMap.set(msg.channelId, msg);
      }
    }

    // Add channel conversations to result
    for (const [channelId, lastMessage] of channelConvoMap) {
      const unreadCount = computeChannelUnreadCount(
        channelMessages,
        lastReadEntries,
        channelId,
        myNodeNum,
      );
      result.push({
        type: "channel",
        id: channelId,
        lastMessage,
        unreadCount,
      });
    }

    // Sort by last message date (most recent first)
    result.sort((a, b) => {
      const aDate = a.lastMessage?.date?.getTime() ?? 0;
      const bDate = b.lastMessage?.date?.getTime() ?? 0;
      return bDate - aDate;
    });

    return result;
  }, [directMessages, channelMessages, lastReadEntries, myNodeNum]);

  return { conversations };
}
