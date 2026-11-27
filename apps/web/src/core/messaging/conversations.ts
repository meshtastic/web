import {
  type ConversationKey,
  conversationKeyString,
  type Message,
  type StoredConversation,
} from "@core/storage/types.ts";
import type { ConversationAccessors } from "./conversationList.ts";
import { excerpt } from "./thread.ts";

/**
 * Per-conversation sidebar state the chat client keeps current: the latest
 * text message and the unread count. Keyed by `conversationKeyString`.
 */
export interface ConversationSummary {
  readonly key: ConversationKey;
  readonly lastMessage?: Message;
  readonly unread: number;
  /**
   * Who sent the unread messages that @mention me, one entry per message
   * (see `mentionAttention`).
   */
  readonly mentionedBy?: readonly number[];
}

/**
 * How many of `mentionedBy` deserve attention: a mention of me breaks
 * through a muted channel (it is a ping aimed at me), but a muted node
 * can't force it, as on Android.
 */
export const mentionAttention = (
  mentionedBy: readonly number[] | undefined,
  isMutedNode: (nodeNum: number) => boolean,
): number => {
  let count = 0;
  for (const from of mentionedBy ?? []) {
    if (!isMutedNode(from)) count++;
  }
  return count;
};

const withMention = (
  mentionedBy: readonly number[] | undefined,
  from: number | undefined,
): { readonly mentionedBy?: readonly number[] } => {
  const all =
    from === undefined ? (mentionedBy ?? []) : [...(mentionedBy ?? []), from];
  return all.length > 0 ? { mentionedBy: all } : {};
};

export type SummaryMap = ReadonlyMap<string, ConversationSummary>;

export const EMPTY_SUMMARIES: SummaryMap = new Map();

/**
 * Records a message as it arrives (or is sent): it becomes the preview,
 * since previews follow arrival order like storage's `seq` (the radio's
 * `rxTime` can be skewed), and counts unread when `countUnread` (as an
 * unread mention of me too when `mentionsMe`).
 */
export const withMessage = (
  map: SummaryMap,
  key: ConversationKey,
  message: Message,
  countUnread: boolean,
  mentionsMe: boolean = false,
): SummaryMap => {
  const k = conversationKeyString(key);
  const current = map.get(k);
  const next = new Map(map);
  next.set(k, {
    key,
    lastMessage: message,
    unread: (current?.unread ?? 0) + (countUnread ? 1 : 0),
    ...withMention(
      current?.mentionedBy,
      countUnread && mentionsMe ? message.from : undefined,
    ),
  });
  return next;
};

/** Replaces the preview if it is the message with `id` (e.g. a state change). */
export const withMessagePatched = (
  map: SummaryMap,
  id: number,
  patch: Partial<Message>,
): SummaryMap => {
  for (const [k, summary] of map) {
    if (summary.lastMessage?.id !== id) continue;
    const next = new Map(map);
    next.set(k, {
      ...summary,
      lastMessage: { ...summary.lastMessage, ...patch },
    });
    return next;
  }
  return map;
};

export const withRead = (map: SummaryMap, key: ConversationKey): SummaryMap => {
  const k = conversationKeyString(key);
  const current = map.get(k);
  if (!current || (current.unread === 0 && !current.mentionedBy)) return map;
  const next = new Map(map);
  next.set(k, {
    key: current.key,
    ...(current.lastMessage ? { lastMessage: current.lastMessage } : {}),
    unread: 0,
  });
  return next;
};

export const withoutConversation = (
  map: SummaryMap,
  key: ConversationKey,
): SummaryMap => {
  const k = conversationKeyString(key);
  if (!map.has(k)) return map;
  const next = new Map(map);
  next.delete(k);
  return next;
};

/**
 * Folds what storage held when hydration started into what arrived since.
 * A preview that arrived live is newer than anything stored; unread is the
 * stored count plus `liveUnread`, the messages counted since hydration
 * started (storage hadn't seen those yet); unread mentions of me likewise
 * with `liveMentions`.
 */
export const mergeStored = (
  map: SummaryMap,
  stored: readonly StoredConversation[],
  liveUnread: ReadonlyMap<string, number>,
  liveMentions: ReadonlyMap<string, readonly number[]> = new Map(),
): SummaryMap => {
  if (stored.length === 0) return map;
  const next = new Map(map);
  for (const s of stored) {
    const k = conversationKeyString(s.key);
    const current = next.get(k);
    next.set(k, {
      key: s.key,
      lastMessage: current?.lastMessage ?? s.lastMessage,
      unread: s.unread + (liveUnread.get(k) ?? 0),
      ...withMention(
        [...(s.mentionedBy ?? []), ...(liveMentions.get(k) ?? [])],
        undefined,
      ),
    });
  }
  return next;
};

/** Unread mentions of me per conversation, keyed by `conversationKeyString`. */
export const unreadMentions = (
  map: SummaryMap,
): ReadonlyMap<string, readonly number[]> => {
  const out = new Map<string, readonly number[]>();
  for (const [k, s] of map) if (s.mentionedBy) out.set(k, s.mentionedBy);
  return out;
};

/** Conversations with unread messages, keyed by `conversationKeyString`. */
export const unreadCounts = (map: SummaryMap): ReadonlyMap<string, number> => {
  const out = new Map<string, number>();
  for (const [k, s] of map) if (s.unread > 0) out.set(k, s.unread);
  return out;
};

export const totalUnread = (map: SummaryMap): number => {
  let sum = 0;
  for (const s of map.values()) sum += s.unread;
  return sum;
};

/**
 * A sidebar row. The UI turns `target` into a title (channel name, node
 * long name) and avatar; everything else is ready to render.
 */
export interface SidebarConversation {
  /** `conversationKeyString`, stable for React keys and routing. */
  readonly id: string;
  readonly key: ConversationKey;
  readonly target:
    | { readonly kind: "channel"; readonly channel: number }
    | { readonly kind: "dm"; readonly peer: number };
  readonly lastMessage?: {
    readonly from: number;
    readonly excerpt: string;
    readonly rxTime: Date;
  };
  readonly unread: number;
  readonly favorite: boolean;
  /**
   * An unread message @mentions me, from a node that isn't muted: worth
   * attention even in a muted channel.
   */
  readonly mentioned?: boolean;
}

export interface SidebarChannel {
  readonly index: number;
  /** Disabled channel slots aren't listed. */
  readonly enabled: boolean;
}

export interface BuildSidebarInput {
  readonly summaries: SummaryMap;
  /** Every channel slot; enabled ones are listed even without messages. */
  readonly channels: readonly SidebarChannel[];
  /** Node favourites from the node DB. Channels have no favourite source. */
  readonly isFavoriteNode: (nodeNum: number) => boolean;
  /** Nodes not to list (e.g. ignored ones). */
  readonly isHiddenNode?: (nodeNum: number) => boolean;
  /** Muted nodes: their mentions of me don't ask for attention. */
  readonly isMutedNode?: (nodeNum: number) => boolean;
}

/**
 * Every conversation the sidebar lists: enabled channels in slot order,
 * then direct conversations that have messages. Sort and filter with
 * `filterConversations` and `sidebarAccessors`.
 */
export const buildSidebarConversations = (
  input: BuildSidebarInput,
): SidebarConversation[] => {
  const row = (
    key: ConversationKey,
    summary: ConversationSummary | undefined,
  ): SidebarConversation => {
    const last = summary?.lastMessage;
    const mentioned =
      mentionAttention(
        summary?.mentionedBy,
        input.isMutedNode ?? (() => false),
      ) > 0;
    return {
      id: conversationKeyString(key),
      key,
      target:
        key.kind === "channel"
          ? { kind: "channel", channel: key.channel }
          : { kind: "dm", peer: key.peer },
      ...(last
        ? {
            lastMessage: {
              from: last.from,
              excerpt: excerpt(last.text),
              rxTime: last.rxTime,
            },
          }
        : {}),
      unread: summary?.unread ?? 0,
      favorite: key.kind === "direct" && input.isFavoriteNode(key.peer),
      ...(mentioned ? { mentioned } : {}),
    };
  };
  const channels = input.channels
    .filter((c) => c.enabled)
    .map((c) => {
      const key: ConversationKey = { kind: "channel", channel: c.index };
      return row(key, input.summaries.get(conversationKeyString(key)));
    });
  const direct = [...input.summaries.values()]
    .filter(
      (s) =>
        s.key.kind === "direct" && !(input.isHiddenNode?.(s.key.peer) ?? false),
    )
    .map((s) => row(s.key, s));
  return [...channels, ...direct];
};

/**
 * Accessors for `filterConversations` / `countByFilter` over sidebar rows;
 * `title` gives each row's display name (the UI resolves names).
 */
export const sidebarAccessors = (
  title: (row: SidebarConversation) => string,
): ConversationAccessors<SidebarConversation> => ({
  unreadCount: (row) => row.unread,
  isFavorite: (row) => row.favorite,
  searchText: (row) => [title(row), row.lastMessage?.excerpt],
  lastActivity: (row) => row.lastMessage?.rxTime.getTime(),
  name: title,
});

const sameRow = (a: SidebarConversation, b: SidebarConversation): boolean =>
  a.id === b.id &&
  a.unread === b.unread &&
  a.favorite === b.favorite &&
  a.mentioned === b.mentioned &&
  a.lastMessage?.from === b.lastMessage?.from &&
  a.lastMessage?.excerpt === b.lastMessage?.excerpt &&
  a.lastMessage?.rxTime.getTime() === b.lastMessage?.rxTime.getTime();

/**
 * `next`, reusing every row of `previous` that hasn't changed (and
 * `previous` itself when nothing has), so memoised rows don't re-render.
 */
export const stabilizeRows = (
  previous: readonly SidebarConversation[],
  next: readonly SidebarConversation[],
): readonly SidebarConversation[] => {
  const byId = new Map(previous.map((row) => [row.id, row]));
  const rows = next.map((row) => {
    const old = byId.get(row.id);
    return old && sameRow(old, row) ? old : row;
  });
  return rows.length === previous.length &&
    rows.every((row, i) => row === previous[i])
    ? previous
    : rows;
};

/** `stabilizeRows` against whatever this stabiliser returned last. */
export const createRowStabilizer = (): ((
  next: readonly SidebarConversation[],
) => readonly SidebarConversation[]) => {
  let previous: readonly SidebarConversation[] = [];
  return (next) => {
    previous = stabilizeRows(previous, next);
    return previous;
  };
};
