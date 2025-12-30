/**
 * Message hooks using useReactiveQuery for reactive updates
 */

import { MessageError } from "@data/errors";
import { DB_EVENTS, dbEvents } from "@data/events";
import { messageRepo } from "@data/repositories";
import type { Message } from "@data/schema";
import { messages } from "@data/schema";
import type { ConversationType } from "@data/types";
import { and, desc, eq, or } from "drizzle-orm";
import type { Result } from "neverthrow";
import { ResultAsync } from "neverthrow";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { getClient, getDb } from "../../../data/client.ts";

/**
 * Hook to fetch direct messages between two nodes
 * Auto-refreshes when new messages are saved
 */
export function useDirectMessages(
  deviceId: number,
  nodeA: number,
  nodeB: number,
  limit = 50,
) {
  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.ownerNodeNum, deviceId),
            eq(messages.type, "direct"),
            or(
              and(eq(messages.fromNode, nodeA), eq(messages.toNode, nodeB)),
              and(eq(messages.fromNode, nodeB), eq(messages.toNode, nodeA)),
            ),
          ),
        )
        .orderBy(desc(messages.date))
        .limit(limit),
    [deviceId, nodeA, nodeB, limit],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(async () => {
    // No-op for reactive query
    return ResultAsync.fromSafePromise(Promise.resolve([] as Message[]));
  }, []);

  return {
    messages: data ?? [],
    refresh,
    isLoading: status === "pending" && !data,
  };
}

/**
 * Hook to fetch broadcast messages for a channel
 * Auto-refreshes when new messages are saved
 */
export function useChannelMessages(
  deviceId: number,
  channelId: number,
  limit = 50,
) {
  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.ownerNodeNum, deviceId),
            eq(messages.type, "channel"),
            eq(messages.channelId, channelId),
          ),
        )
        .orderBy(desc(messages.date))
        .limit(limit),
    [deviceId, channelId, limit],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(async () => {
    // No-op
    return ResultAsync.fromSafePromise(Promise.resolve([] as Message[]));
  }, []);

  return {
    messages: data ?? [],
    refresh,
    isLoading: status === "pending" && !data,
  };
}

/**
 * Hook to fetch all messages for a device (paginated)
 */
export function useAllMessages(deviceId: number, limit = 100, offset = 0) {
  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(messages)
        .where(eq(messages.ownerNodeNum, deviceId))
        .orderBy(desc(messages.date))
        .limit(limit)
        .offset(offset),
    [deviceId, limit, offset],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(async () => {
    // No-op
    return ResultAsync.fromSafePromise(Promise.resolve([] as Message[]));
  }, []);

  return {
    messages: data ?? [],
    refresh,
    isLoading: status === "pending" && !data,
  };
}

/**
 * Hook to fetch pending messages (for retry logic)
 */
export function usePendingMessages(deviceId: number) {
  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.ownerNodeNum, deviceId),
            or(
              eq(messages.state, "waiting"),
              eq(messages.state, "sending"),
              eq(messages.state, "failed"),
            ),
          ),
        )
        .orderBy(desc(messages.date)),
    [deviceId],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(async () => {
    // No-op
    return ResultAsync.fromSafePromise(Promise.resolve([] as Message[]));
  }, []);

  return {
    messages: data ?? [],
    refresh,
    isLoading: status === "pending" && !data,
  };
}

type Conversation = {
  type: ConversationType;
  id: number;
  lastMessage: Message | null;
  unreadCount: number;
};

/**
 * Cache for conversation data
 */
class ConversationCache {
  private data = new Map<string, Conversation[]>();
  private listeners = new Set<() => void>();
  private static readonly EMPTY_CONVERSATIONS: Conversation[] = [];

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  get(key: string): Conversation[] {
    return this.data.get(key) ?? ConversationCache.EMPTY_CONVERSATIONS;
  }

  set(key: string, conversations: Conversation[]): void {
    this.data.set(key, conversations);
    this.notify();
  }
}

const conversationCache = new ConversationCache();

/**
 * Hook to get conversations list (for contact sidebar)
 * Returns a list of unique conversations with their last message and unread counts
 * @param myNodeNum - The current user's node number (needed for unread count calculations)
 */
export function useConversations(deviceId: number, myNodeNum: number) {
  const cacheKey = `conversations:${deviceId}:${myNodeNum}`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubCache = conversationCache.subscribe(onStoreChange);
      const unsubDb = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, async () => {
        const result = await messageRepo.getConversations(deviceId, myNodeNum);
        conversationCache.set(cacheKey, result);
      });

      return () => {
        unsubCache();
        unsubDb();
      };
    },
    [deviceId, myNodeNum, cacheKey],
  );

  const getSnapshot = useCallback(
    () => conversationCache.get(cacheKey),
    [cacheKey],
  );

  const conversations = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  // Initial load
  useEffect(() => {
    messageRepo
      .getConversations(deviceId, myNodeNum)
      .then((result) => conversationCache.set(cacheKey, result));
  }, [deviceId, myNodeNum, cacheKey]);

  const refresh = useCallback(async (): Promise<
    Result<Conversation[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getConversations(deviceId, myNodeNum),
      (cause) => MessageError.getConversations(deviceId, cause),
    );
    if (result.isOk()) {
      conversationCache.set(cacheKey, result.value);
    }
    return result;
  }, [deviceId, myNodeNum, cacheKey]);

  return { conversations, refresh };
}