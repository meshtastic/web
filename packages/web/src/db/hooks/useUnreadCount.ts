import { messageRepo } from "@db/index";
import { dbEvents, DB_EVENTS } from "@db/events";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook to get unread count for a direct conversation
 */
export function useUnreadCountDirect(
  deviceId: number,
  nodeA: number,
  nodeB: number,
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const count = await messageRepo.getUnreadCountDirect(deviceId, nodeA, nodeB);
      setUnreadCount(count);
    } catch (error) {
      console.error("[useUnreadCountDirect] Error:", error);
    } finally {
      setLoading(false);
    }
  }, [deviceId, nodeA, nodeB]);

  useEffect(() => {
    refresh();

    // Subscribe to message events for auto-refresh
    const unsubscribe = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { unreadCount, loading, refresh };
}

/**
 * Hook to get unread count for a broadcast channel
 */
export function useUnreadCountBroadcast(
  deviceId: number,
  channelId: number,
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const count = await messageRepo.getUnreadCountBroadcast(deviceId, channelId);
      setUnreadCount(count);
    } catch (error) {
      console.error("[useUnreadCountBroadcast] Error:", error);
    } finally {
      setLoading(false);
    }
  }, [deviceId, channelId]);

  useEffect(() => {
    refresh();

    // Subscribe to message events for auto-refresh
    const unsubscribe = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { unreadCount, loading, refresh };
}

/**
 * Helper to mark a conversation as read
 */
export async function markConversationAsRead(
  deviceId: number,
  type: "direct" | "broadcast",
  conversationId: string | number,
  lastMessageId: number,
): Promise<void> {
  const convId = typeof conversationId === "number"
    ? conversationId.toString()
    : conversationId;

  await messageRepo.markAsRead(deviceId, type, convId, lastMessageId);
  dbEvents.emit(DB_EVENTS.MESSAGE_SAVED); // Trigger unread count refresh
}
