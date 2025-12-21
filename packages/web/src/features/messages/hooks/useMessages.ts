/**
 * Message hooks using useSyncExternalStore for React 19 best practices
 *
 * These hooks subscribe to database events and provide reactive message data
 * without the tearing issues that can occur with useState + useEffect patterns.
 */

import { MessageError } from "@data/errors";
import { DB_EVENTS, dbEvents } from "@data/events";
import { messageRepo } from "@data/repositories";
import type { Message } from "@data/schema";
import type { ConversationType } from "@data/types";
import type { Result } from "neverthrow";
import { ResultAsync } from "neverthrow";
import { useCallback, useEffect, useSyncExternalStore } from "react";

// ==================== Message Cache ====================

type CacheKey = string;

/**
 * Cache for message data supporting useSyncExternalStore
 */
class MessageCache {
  private data = new Map<CacheKey, Message[]>();
  private listeners = new Set<() => void>();
  private static readonly EMPTY_MESSAGES: Message[] = [];

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  get(key: CacheKey): Message[] {
    return this.data.get(key) ?? MessageCache.EMPTY_MESSAGES;
  }

  set(key: CacheKey, messages: Message[]): void {
    this.data.set(key, messages);
    this.notify();
  }
}

const messageCache = new MessageCache();

// Helper to create cache keys
const keys = {
  direct: (deviceId: number, nodeA: number, nodeB: number, limit: number) =>
    `direct:${deviceId}:${Math.min(nodeA, nodeB)}:${Math.max(nodeA, nodeB)}:${limit}`,
  channel: (deviceId: number, channelId: number, limit: number) =>
    `channel:${deviceId}:${channelId}:${limit}`,
  all: (deviceId: number, limit: number, offset: number) =>
    `all:${deviceId}:${limit}:${offset}`,
  pending: (deviceId: number) => `pending:${deviceId}`,
};

// ==================== Direct Messages Hook ====================

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
  const cacheKey = keys.direct(deviceId, nodeA, nodeB, limit);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubCache = messageCache.subscribe(onStoreChange);
      const unsubDb = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, async () => {
        const result = await messageRepo.getDirectMessages(
          deviceId,
          nodeA,
          nodeB,
          limit,
        );
        messageCache.set(cacheKey, result);
      });

      return () => {
        unsubCache();
        unsubDb();
      };
    },
    [deviceId, nodeA, nodeB, limit, cacheKey],
  );

  const getSnapshot = useCallback(() => messageCache.get(cacheKey), [cacheKey]);

  const messages = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Initial load
  useEffect(() => {
    messageRepo
      .getDirectMessages(deviceId, nodeA, nodeB, limit)
      .then((result) => messageCache.set(cacheKey, result));
  }, [deviceId, nodeA, nodeB, limit, cacheKey]);

  const refresh = useCallback(async (): Promise<
    Result<Message[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getDirectMessages(deviceId, nodeA, nodeB, limit),
      (cause) => MessageError.getDirectMessages(deviceId, nodeA, nodeB, cause),
    );
    if (result.isOk()) {
      messageCache.set(cacheKey, result.value);
    }
    return result;
  }, [deviceId, nodeA, nodeB, limit, cacheKey]);

  return { messages, refresh };
}

// ==================== Channel Messages Hook ====================

/**
 * Hook to fetch broadcast messages for a channel
 * Auto-refreshes when new messages are saved
 */
export function useChannelMessages(
  deviceId: number,
  channelId: number,
  limit = 50,
) {
  const cacheKey = keys.channel(deviceId, channelId, limit);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubCache = messageCache.subscribe(onStoreChange);
      const unsubDb = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, async () => {
        const result = await messageRepo.getBroadcastMessages(
          deviceId,
          channelId,
          limit,
        );
        messageCache.set(cacheKey, result);
      });

      return () => {
        unsubCache();
        unsubDb();
      };
    },
    [deviceId, channelId, limit, cacheKey],
  );

  const getSnapshot = useCallback(() => messageCache.get(cacheKey), [cacheKey]);

  const messages = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Initial load
  useEffect(() => {
    messageRepo
      .getBroadcastMessages(deviceId, channelId, limit)
      .then((result) => messageCache.set(cacheKey, result));
  }, [deviceId, channelId, limit, cacheKey]);

  const refresh = useCallback(async (): Promise<
    Result<Message[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getBroadcastMessages(deviceId, channelId, limit),
      (cause) => MessageError.getBroadcastMessages(deviceId, channelId, cause),
    );
    if (result.isOk()) {
      messageCache.set(cacheKey, result.value);
    }
    return result;
  }, [deviceId, channelId, limit, cacheKey]);

  return { messages, refresh };
}

// ==================== All Messages Hook ====================

/**
 * Hook to fetch all messages for a device (paginated)
 */
export function useAllMessages(deviceId: number, limit = 100, offset = 0) {
  const cacheKey = keys.all(deviceId, limit, offset);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubCache = messageCache.subscribe(onStoreChange);
      const unsubDb = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, async () => {
        const result = await messageRepo.getAllMessages(deviceId, limit, offset);
        messageCache.set(cacheKey, result);
      });

      return () => {
        unsubCache();
        unsubDb();
      };
    },
    [deviceId, limit, offset, cacheKey],
  );

  const getSnapshot = useCallback(() => messageCache.get(cacheKey), [cacheKey]);

  const messages = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Initial load
  useEffect(() => {
    messageRepo
      .getAllMessages(deviceId, limit, offset)
      .then((result) => messageCache.set(cacheKey, result));
  }, [deviceId, limit, offset, cacheKey]);

  const refresh = useCallback(async (): Promise<
    Result<Message[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getAllMessages(deviceId, limit, offset),
      (cause) => MessageError.getAllMessages(deviceId, cause),
    );
    if (result.isOk()) {
      messageCache.set(cacheKey, result.value);
    }
    return result;
  }, [deviceId, limit, offset, cacheKey]);

  return { messages, refresh };
}

// ==================== Pending Messages Hook ====================

/**
 * Hook to fetch pending messages (for retry logic)
 */
export function usePendingMessages(deviceId: number) {
  const cacheKey = keys.pending(deviceId);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubCache = messageCache.subscribe(onStoreChange);
      const unsubDb = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, async () => {
        const result = await messageRepo.getPendingMessages(deviceId);
        messageCache.set(cacheKey, result);
      });

      return () => {
        unsubCache();
        unsubDb();
      };
    },
    [deviceId, cacheKey],
  );

  const getSnapshot = useCallback(() => messageCache.get(cacheKey), [cacheKey]);

  const messages = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Initial load
  useEffect(() => {
    messageRepo
      .getPendingMessages(deviceId)
      .then((result) => messageCache.set(cacheKey, result));
  }, [deviceId, cacheKey]);

  const refresh = useCallback(async (): Promise<
    Result<Message[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getPendingMessages(deviceId),
      (cause) => MessageError.getPendingMessages(deviceId, cause),
    );
    if (result.isOk()) {
      messageCache.set(cacheKey, result.value);
    }
    return result;
  }, [deviceId, cacheKey]);

  return { messages, refresh };
}

// ==================== Conversations Hook ====================

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

  const conversations = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

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
