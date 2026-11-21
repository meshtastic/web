/**
 * Tapback reactions: each is a reply packet carrying one emoji. A message's
 * reactions arrive in a flat list of events; the bubble shows one chip per
 * emoji with how many distinct nodes sent it.
 */

export interface ReactionEvent {
  readonly emoji: string;
  readonly fromNode: number;
}

/**
 * Grouping key for an emoji. Variation selector 16 (U+FE0F, "show as
 * emoji") is optional and clients disagree on sending it, so "❤" and "❤️"
 * are the same reaction.
 */
export const reactionKey = (emoji: string): string =>
  emoji.replaceAll("\uFE0F", "");

export interface ReactionChip {
  readonly emoji: string;
  /** Distinct nodes that reacted with this emoji. */
  readonly count: number;
  /** Whether my node is one of them (drawn outlined in accent). */
  readonly mine: boolean;
  readonly fromNodes: readonly number[];
}

/**
 * One chip per emoji, ordered by when the emoji first appeared so chips
 * don't jump around when counts change. Repeats of the same emoji from the
 * same node count once.
 */
export const aggregateReactions = (
  events: readonly ReactionEvent[],
  myNodeNum: number | undefined,
): ReactionChip[] => {
  // Keyed by reactionKey; shows the first spelling seen.
  const byEmoji = new Map<string, { emoji: string; fromNodes: number[] }>();
  for (const { emoji, fromNode } of events) {
    const key = reactionKey(emoji);
    if (key.length === 0) {
      continue;
    }
    const group = byEmoji.get(key);
    if (!group) {
      byEmoji.set(key, { emoji, fromNodes: [fromNode] });
    } else if (!group.fromNodes.includes(fromNode)) {
      group.fromNodes.push(fromNode);
    }
  }
  return [...byEmoji.values()].map(({ emoji, fromNodes }) => ({
    emoji,
    count: fromNodes.length,
    mine: myNodeNum !== undefined && fromNodes.includes(myNodeNum),
    fromNodes,
  }));
};

export type ReactionToggle =
  | { readonly action: "add"; readonly events: readonly ReactionEvent[] }
  | { readonly action: "remove"; readonly events: readonly ReactionEvent[] };

/**
 * Clicking a chip (or picking an emoji) toggles my reaction: adds it if I
 * haven't sent that emoji, otherwise removes mine. `events` is the optimistic
 * list to render while the packet is sent.
 */
export const toggleReaction = (
  events: readonly ReactionEvent[],
  emoji: string,
  myNodeNum: number,
): ReactionToggle => {
  const key = reactionKey(emoji);
  const isMine = (event: ReactionEvent) =>
    reactionKey(event.emoji) === key && event.fromNode === myNodeNum;
  if (events.some(isMine)) {
    return { action: "remove", events: events.filter((e) => !isMine(e)) };
  }
  return {
    action: "add",
    events: [...events, { emoji, fromNode: myNodeNum }],
  };
};
