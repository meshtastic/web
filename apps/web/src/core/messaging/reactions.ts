/**
 * Tapback reactions: each is a reply packet carrying one emoji. A message's
 * reactions arrive in a flat list of events; the bubble shows one chip per
 * emoji with how many distinct nodes sent it.
 */

import type { MessageState } from "@core/storage/types.ts";

/** Delivery of a reaction I sent: the packet that carried it and its state. */
export interface OwnReactionDelivery {
  readonly packetId: number;
  readonly state: MessageState;
}

export interface ReactionEvent {
  readonly emoji: string;
  readonly fromNode: number;
  /** Set on my own reactions, so the chip can show pending / failed. */
  readonly delivery?: OwnReactionDelivery;
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
  /**
   * How my reaction's packet fared, when `mine` and it was sent from here:
   * pending, failed (offer retry with `packetId`), or delivered.
   */
  readonly own?: OwnReactionDelivery;
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
  const byEmoji = new Map<
    string,
    { emoji: string; fromNodes: number[]; own?: OwnReactionDelivery }
  >();
  for (const { emoji, fromNode, delivery } of events) {
    const key = reactionKey(emoji);
    if (key.length === 0) {
      continue;
    }
    let group = byEmoji.get(key);
    if (!group) {
      group = { emoji, fromNodes: [fromNode] };
      byEmoji.set(key, group);
    } else if (!group.fromNodes.includes(fromNode)) {
      group.fromNodes.push(fromNode);
    }
    if (delivery && myNodeNum !== undefined && fromNode === myNodeNum) {
      group.own = delivery;
    }
  }
  return [...byEmoji.values()].map(({ emoji, fromNodes, own }) => {
    const mine = myNodeNum !== undefined && fromNodes.includes(myNodeNum);
    return {
      emoji,
      count: fromNodes.length,
      mine,
      fromNodes,
      ...(mine && own ? { own } : {}),
    };
  });
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
