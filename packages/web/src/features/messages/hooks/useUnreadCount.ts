import { DB_EVENTS, dbEvents } from "@data/events";
import { messageRepo } from "@data/index";
import { type ConversationType } from "@data/types";
import { useCallback, useMemo } from "react";
import { getClient, getDb } from "../../../data/client.ts";
import { lastRead, messages } from "../../../data/schema.ts";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { useReactiveQuery } from "sqlocal/react";

/**
 * Hook to get unread count for a direct conversation
 * @param myNodeNum - The current user's node number
 * @param otherNodeNum - The other party's node number
 */
export function useUnreadCountDirect(
  deviceId: number,
  myNodeNum: number,
  otherNodeNum: number,
) {
  const conversationId = `${myNodeNum}:${otherNodeNum}`;

  const query = useMemo(
    () =>
      getDb()
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .leftJoin(
          lastRead,
          and(
            eq(lastRead.ownerNodeNum, messages.ownerNodeNum),
            eq(lastRead.type, "direct"),
            eq(lastRead.conversationId, conversationId),
          ),
        )
        .where(
          and(
            eq(messages.ownerNodeNum, deviceId),
            eq(messages.type, "direct"),
            or(
              and(
                eq(messages.fromNode, myNodeNum),
                eq(messages.toNode, otherNodeNum),
              ),
              and(
                eq(messages.fromNode, otherNodeNum),
                eq(messages.toNode, myNodeNum),
              ),
            ),
            or(isNull(lastRead.messageId), gt(messages.id, lastRead.messageId)),
          ),
        ),
    [deviceId, myNodeNum, otherNodeNum, conversationId],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(() => {
    // No-op for reactive query
  }, []);

  return {
    unreadCount: data?.[0]?.count ?? 0,
    loading: status === "pending" && !data,
    refresh,
  };
}

/**
 * Hook to get unread count for a channel
 */
export function useUnreadCountBroadcast(deviceId: number, channelId: number) {
  const conversationId = channelId.toString();

  const query = useMemo(
    () =>
      getDb()
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .leftJoin(
          lastRead,
          and(
            eq(lastRead.ownerNodeNum, messages.ownerNodeNum),
            eq(lastRead.type, "channel"),
            eq(lastRead.conversationId, conversationId),
          ),
        )
        .where(
          and(
            eq(messages.ownerNodeNum, deviceId),
            eq(messages.type, "channel"),
            eq(messages.channelId, channelId),
            or(isNull(lastRead.messageId), gt(messages.id, lastRead.messageId)),
          ),
        ),
    [deviceId, channelId, conversationId],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(() => {
    // No-op for reactive query
  }, []);

  return {
    unreadCount: data?.[0]?.count ?? 0,
    loading: status === "pending" && !data,
    refresh,
  };
}

/**
 * Helper to mark a conversation as read
 */
export async function markConversationAsRead(
  deviceId: number,
  type: ConversationType,
  conversationId: string | number,
  lastMessageId: number,
): Promise<void> {
  const convId =
    typeof conversationId === "number"
      ? conversationId.toString()
      : conversationId;

  await messageRepo.markAsRead(deviceId, type, convId, lastMessageId);
  dbEvents.emit(DB_EVENTS.MESSAGE_SAVED); // Trigger unread count refresh
}