import type { ConversationKey } from "@meshtastic/sdk";
import { useActiveClient } from "../adapters/useActiveClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

const EMPTY_NUMBER_SIGNAL = {
  value: 0,
  peek: () => 0,
  subscribe: () => () => {},
} as const;

const EMPTY_MAP_SIGNAL = {
  value: new Map<string, number>() as ReadonlyMap<string, number>,
  peek: () => new Map<string, number>() as ReadonlyMap<string, number>,
  subscribe: () => () => {},
} as const;

/**
 * Total unread count across every conversation on the active client.
 * Returns 0 when no client is active.
 */
export function useTotalUnread(): number {
  const client = useActiveClient();
  return useSignal(client?.chat.unread.total ?? EMPTY_NUMBER_SIGNAL);
}

/**
 * Unread count for a single conversation. Returns 0 when no client is active.
 */
export function useUnreadCount(key: ConversationKey): number {
  const client = useActiveClient();
  return useSignal(client?.chat.unread.count(key) ?? EMPTY_NUMBER_SIGNAL);
}

/**
 * Whole unread map (`<conversation-key-string, count>`). Useful for sidebar
 * badges that walk every saved conversation.
 */
export function useUnreadByKey(): ReadonlyMap<string, number> {
  const client = useActiveClient();
  return useSignal(client?.chat.unread.byKey ?? EMPTY_MAP_SIGNAL);
}
