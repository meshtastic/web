/**
 * Reaction hooks for fetching message reactions
 */

import { reactionRepo } from "@data/repositories";
import type { Reaction } from "@data/schema";
import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Hook to fetch reactions for multiple messages
 * Returns a Map of messageId -> Reaction[]
 *
 * Uses useSyncExternalStore + useMemo instead of sqlocal's useReactiveQuery
 * because useReactiveQuery captures the query via useState's lazy initializer,
 * which only runs on mount. When messageIds changes (e.g. from [] to real IDs),
 * the query is never updated, so reactions are never found.
 */
export function useReactions(ownerNodeNum: number, messageIds: number[]) {
  // Use a stable key for the messageIds array to prevent unnecessary re-renders
  const messageIdsKey = messageIds.join(",");

  // eslint-disable-next-line react-hooks/exhaustive-deps -- messageIdsKey is stable key for messageIds
  const query = useMemo(() => {
    const ids = messageIds.length > 0 ? messageIds : [-1];
    return reactionRepo.buildReactionsForMessagesQuery(ownerNodeNum, ids);
  }, [ownerNodeNum, messageIdsKey]);

  const reactiveQuery = useMemo(
    () => reactionRepo.getClient().reactiveQuery(query),
    [query],
  );

  const subscribe = useCallback(
    (callback: () => void) => {
      const subscription = reactiveQuery.subscribe(() => callback());
      return () => subscription.unsubscribe();
    },
    [reactiveQuery],
  );

  const getSnapshot = useCallback(() => reactiveQuery.value, [reactiveQuery]);

  const data = useSyncExternalStore(subscribe, getSnapshot) as Reaction[];

  // Group reactions by targetMessageId
  const reactionsByMessage = useMemo(() => {
    const map = new Map<number, Reaction[]>();
    if (!data) return map;

    for (const reaction of data) {
      const existing = map.get(reaction.targetMessageId) ?? [];
      existing.push(reaction);
      map.set(reaction.targetMessageId, existing);
    }

    return map;
  }, [data]);

  return {
    reactions: reactionsByMessage,
    isLoading: !data || data.length === 0,
  };
}

/**
 * Hook to fetch reactions for a single message
 */
export function useMessageReactions(
  ownerNodeNum: number,
  targetMessageId: number,
) {
  const query = useMemo(
    () => reactionRepo.buildReactionsQuery(ownerNodeNum, targetMessageId),
    [ownerNodeNum, targetMessageId],
  );

  const reactiveQuery = useMemo(
    () => reactionRepo.getClient().reactiveQuery(query),
    [query],
  );

  const subscribe = useCallback(
    (callback: () => void) => {
      const subscription = reactiveQuery.subscribe(() => callback());
      return () => subscription.unsubscribe();
    },
    [reactiveQuery],
  );

  const getSnapshot = useCallback(() => reactiveQuery.value, [reactiveQuery]);

  const data = useSyncExternalStore(subscribe, getSnapshot) as Reaction[];

  return {
    reactions: data ?? [],
    isLoading: !data || data.length === 0,
  };
}

/**
 * Group reactions by emoji with count and list of senders
 */
export interface GroupedReaction {
  emoji: string;
  count: number;
  fromNodes: number[];
}

export function groupReactions(reactions: Reaction[]): GroupedReaction[] {
  const grouped = new Map<string, { count: number; fromNodes: number[] }>();

  for (const reaction of reactions) {
    const existing = grouped.get(reaction.emoji);
    if (existing) {
      existing.count++;
      if (!existing.fromNodes.includes(reaction.fromNode)) {
        existing.fromNodes.push(reaction.fromNode);
      }
    } else {
      grouped.set(reaction.emoji, {
        count: 1,
        fromNodes: [reaction.fromNode],
      });
    }
  }

  return Array.from(grouped.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    fromNodes: data.fromNodes,
  }));
}
