import type { Result } from "neverthrow";
import { ResultAsync } from "neverthrow";
import { useCallback, useEffect, useState } from "react";
import { MessageError } from "../errors";
import { DB_EVENTS, dbEvents } from "../events";
import { messageRepo } from "../repositories";
import type { Message } from "../schema";

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
  const [messages, setMessages] = useState<Message[]>([]);

  const refresh = useCallback(async (): Promise<
    Result<Message[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getDirectMessages(deviceId, nodeA, nodeB, limit),
      (cause) => MessageError.getDirectMessages(deviceId, nodeA, nodeB, cause),
    );
    if (result.isOk()) {
      setMessages(result.value);
    }
    return result;
  }, [deviceId, nodeA, nodeB, limit]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { messages, refresh };
}

/**
 * Hook to fetch broadcast messages for a channel
 * Auto-refreshes when new messages are saved
 */
export function useBroadcastMessages(
  deviceId: number,
  channelId: number,
  limit = 50,
) {
  const [messages, setMessages] = useState<Message[]>([]);

  const refresh = useCallback(async (): Promise<
    Result<Message[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getBroadcastMessages(deviceId, channelId, limit),
      (cause) => MessageError.getBroadcastMessages(deviceId, channelId, cause),
    );
    if (result.isOk()) {
      setMessages(result.value);
    }
    return result;
  }, [deviceId, channelId, limit]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { messages, refresh };
}

/**
 * Hook to fetch all messages for a device (paginated)
 */
export function useAllMessages(deviceId: number, limit = 100, offset = 0) {
  const [messages, setMessages] = useState<Message[]>([]);

  const refresh = useCallback(async (): Promise<
    Result<Message[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getAllMessages(deviceId, limit, offset),
      (cause) => MessageError.getAllMessages(deviceId, cause),
    );
    if (result.isOk()) {
      setMessages(result.value);
    }
    return result;
  }, [deviceId, limit, offset]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { messages, refresh };
}

/**
 * Hook to fetch pending messages (for retry logic)
 */
export function usePendingMessages(deviceId: number) {
  const [messages, setMessages] = useState<Message[]>([]);

  const refresh = useCallback(async (): Promise<
    Result<Message[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getPendingMessages(deviceId),
      (cause) => MessageError.getPendingMessages(deviceId, cause),
    );
    if (result.isOk()) {
      setMessages(result.value);
    }
    return result;
  }, [deviceId]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { messages, refresh };
}

type Conversation = {
  type: "direct" | "broadcast";
  id: number;
  lastMessage: Message | null;
  unreadCount: number;
};

/**
 * Hook to get conversations list (for contact sidebar)
 * Returns a list of unique conversations with their last message
 */
export function useConversations(deviceId: number) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const refresh = useCallback(async (): Promise<
    Result<Conversation[], MessageError>
  > => {
    const result = await ResultAsync.fromPromise(
      messageRepo.getConversations(deviceId),
      (cause) => MessageError.getConversations(deviceId, cause),
    );
    if (result.isOk()) {
      setConversations(result.value);
    }
    return result;
  }, [deviceId]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.MESSAGE_SAVED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { conversations, refresh };
}
