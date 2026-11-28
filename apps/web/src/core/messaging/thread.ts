import type { Message, Reaction } from "@core/storage/types.ts";
import { type DeliveryState, deriveDeliveryState } from "./deliveryState.ts";
import { mentionTokenRegex } from "./mentions.ts";
import {
  aggregateReactions,
  type ReactionChip,
  type ReactionEvent,
} from "./reactions.ts";

/**
 * The message a reply points at. `unavailable` when it isn't stored (never
 * received, or pruned): the bubble can still say it's a reply.
 */
export type ReplyRef =
  | {
      readonly kind: "resolved";
      readonly id: number;
      readonly from: number;
      readonly excerpt: string;
    }
  | { readonly kind: "unavailable"; readonly id: number };

/** One bubble's worth of data for the message list. */
export interface ThreadMessage {
  readonly message: Message;
  /** Sent by my node. */
  readonly outgoing: boolean;
  readonly replyTo?: ReplyRef;
  /** One chip per emoji, in first-seen order. */
  readonly reactions: readonly ReactionChip[];
  /** Delivery status line, for outgoing messages only. */
  readonly delivery?: DeliveryState;
  /** Matches the message filter; shown only because the user revealed it. */
  readonly filtered?: boolean;
}

export const DEFAULT_EXCERPT_LENGTH = 80;

/**
 * A one-line preview of `text`: whitespace collapsed, cut at
 * `maxLength` code points (not UTF-16 units, so emoji aren't split) with an
 * ellipsis.
 */
export const excerpt = (
  text: string,
  maxLength: number = DEFAULT_EXCERPT_LENGTH,
): string => {
  const line = text.replace(/\s+/gu, " ").trim();
  const chars = [...line];
  if (chars.length <= maxLength) {
    return line;
  }
  let kept = chars.slice(0, Math.max(0, maxLength - 1)).join("");
  // Never half a mention token: the UI swaps whole tokens for names.
  for (const match of line.matchAll(mentionTokenRegex())) {
    if (
      match.index < kept.length &&
      match.index + match[0].length > kept.length
    ) {
      kept = kept.slice(0, match.index).trimEnd();
      break;
    }
  }
  return `${kept}…`;
};

/** Reactions grouped by the message they target, in arrival order. */
export const reactionsByTarget = (
  reactions: readonly Reaction[],
): ReadonlyMap<number, Reaction[]> => {
  const out = new Map<number, Reaction[]>();
  for (const r of reactions) {
    const list = out.get(r.targetId);
    if (list) list.push(r);
    else out.set(r.targetId, [r]);
  }
  return out;
};

export const toReactionEvent = (r: Reaction): ReactionEvent => ({
  emoji: r.emoji,
  fromNode: r.fromNode,
  delivery: { packetId: r.packetId, state: r.state },
});

export const resolveReply = (
  replyId: number,
  lookup: (id: number) => Message | undefined,
): ReplyRef => {
  const target = lookup(replyId);
  return target
    ? {
        kind: "resolved",
        id: replyId,
        from: target.from,
        excerpt: excerpt(target.text),
      }
    : { kind: "unavailable", id: replyId };
};

export interface BuildThreadOptions {
  readonly myNodeNum: number | undefined;
  /**
   * Finds a reply target outside `messages` (older history fetched on
   * demand). Messages in the list are found without it.
   */
  readonly lookup?: (id: number) => Message | undefined;
}

const NO_REACTIONS: readonly Reaction[] = [];

const sameItems = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((item, i) => item === b[i]);

export type ThreadBuilder = (
  messages: readonly Message[],
  reactions: readonly Reaction[],
  options: BuildThreadOptions,
) => ThreadMessage[];

/**
 * A `buildThread` that remembers each bubble: a message whose object, reply
 * target, reaction objects and local node are unchanged gets the same
 * `ThreadMessage` back, so memoised bubbles don't re-render when something
 * else in the conversation changes.
 */
export const createThreadBuilder = (): ThreadBuilder => {
  const cache = new WeakMap<
    Message,
    {
      readonly reactions: readonly Reaction[];
      readonly replyTarget: Message | undefined;
      readonly myNodeNum: number | undefined;
      readonly value: ThreadMessage;
    }
  >();
  return (messages, reactions, options) => {
    const byId = new Map(messages.map((m) => [m.id, m]));
    const lookup = (id: number) => byId.get(id) ?? options.lookup?.(id);
    const grouped = reactionsByTarget(reactions);
    return messages.map((message) => {
      const own = grouped.get(message.id) ?? NO_REACTIONS;
      const replyTarget =
        message.replyId === undefined ? undefined : lookup(message.replyId);
      const hit = cache.get(message);
      if (
        hit &&
        hit.myNodeNum === options.myNodeNum &&
        hit.replyTarget === replyTarget &&
        sameItems(hit.reactions, own)
      ) {
        return hit.value;
      }
      const outgoing =
        options.myNodeNum !== undefined && message.from === options.myNodeNum;
      const value: ThreadMessage = {
        message,
        outgoing,
        ...(message.replyId === undefined
          ? {}
          : {
              replyTo: resolveReply(message.replyId, () => replyTarget),
            }),
        reactions:
          own.length > 0
            ? aggregateReactions(own.map(toReactionEvent), options.myNodeNum)
            : [],
        ...(outgoing ? { delivery: deriveDeliveryState(message) } : {}),
      };
      cache.set(message, {
        reactions: own,
        replyTarget,
        myNodeNum: options.myNodeNum,
        value,
      });
      return value;
    });
  };
};

/**
 * Joins a conversation's messages (oldest first) with their reactions and
 * reply targets into what the message list renders.
 */
export const buildThread: ThreadBuilder = (messages, reactions, options) =>
  createThreadBuilder()(messages, reactions, options);

/** Reply targets `messages` mention that neither they nor `known` hold. */
export const missingReplyTargets = (
  messages: readonly Message[],
  known: (id: number) => boolean,
): number[] => {
  const ids = new Set(messages.map((m) => m.id));
  const missing = new Set<number>();
  for (const m of messages) {
    if (m.replyId !== undefined && !ids.has(m.replyId) && !known(m.replyId)) {
      missing.add(m.replyId);
    }
  }
  return [...missing];
};
