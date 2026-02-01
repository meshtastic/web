/**
 * Reaction hooks for fetching message reactions
 */

import logger from "@core/services/logger";
import { reactionRepo } from "@data/repositories";
import type { Reaction } from "@data/schema";
import { useMemo, useEffect } from "react";
import { useReactiveQuery } from "sqlocal/react";

/**
 * Hook to fetch reactions for multiple messages
 * Returns a Map of messageId -> Reaction[]
 */
export function useReactions(ownerNodeNum: number, messageIds: number[]) {
  // Use a stable key for the messageIds array to prevent unnecessary re-renders
  const messageIdsKey = messageIds.join(",");

  // eslint-disable-next-line react-hooks/exhaustive-deps -- messageIdsKey is stable key for messageIds
  const query = useMemo(() => {
    const ids = messageIds.length > 0 ? messageIds : [-1];
    return reactionRepo.buildReactionsForMessagesQuery(ownerNodeNum, ids);
  }, [ownerNodeNum, messageIdsKey]);

  const { data, status } = useReactiveQuery<Reaction>(
    reactionRepo.getClient(),
    query,
  );

  // Debug logging for reactive query results
  useEffect(() => {
    logger.info(
      `[useReactions] Query result: status=${status}, reactions=${data.length}, messageIds=${messageIds.slice(0, 5).join(",")}${messageIds.length > 5 ? "..." : ""}`,
      data,
    );
  }, [data, status, messageIds]);

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
    isLoading: status === "pending" && data.length === 0,
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

  const { data, status } = useReactiveQuery<Reaction>(
    reactionRepo.getClient(),
    query,
  );

  return {
    reactions: data ?? [],
    isLoading: status === "pending" && data.length === 0,
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
