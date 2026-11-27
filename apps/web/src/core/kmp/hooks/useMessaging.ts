import {
  type SendReactionInput,
  SendTextError,
  type SendTextInput,
  type ToggleReactionOutcome,
} from "@core/kmp/chat.ts";
import { constantSignal, type ReadonlySignal } from "@core/kmp/signals.ts";
import {
  buildSidebarConversations,
  createRowStabilizer,
  EMPTY_SUMMARIES,
  type SidebarConversation,
  type SummaryMap,
} from "@core/messaging/conversations.ts";
import type { ThreadMessage } from "@core/messaging/thread.ts";
import { Protobuf } from "@core/protobuf.ts";
import {
  type ConversationKey,
  conversationKeyString,
  type Message,
  parseConversationKey,
} from "@core/storage/types.ts";
import { Result } from "better-result";
import { useCallback, useMemo, useState } from "react";
import { useActiveClient } from "./registry.tsx";
import { useChannels } from "./useSession.ts";
import { useSignal } from "./useSignal.ts";

const NO_THREAD = constantSignal<ThreadMessage[]>([]);
const NO_SUMMARIES = constantSignal<SummaryMap>(EMPTY_SUMMARIES);
const NO_NODES = constantSignal<ReadonlySet<number>>(new Set());

const notConnected = <T>(): Promise<Result<T, SendTextError>> =>
  Promise.resolve(Result.err(new SendTextError("not-connected")));

export interface UseThreadResult {
  /** Oldest first, with replies resolved, reaction chips and delivery. */
  messages: ThreadMessage[];
  /** Loads the page before the oldest message held. */
  loadOlder(limit?: number): Promise<Message[]>;
}

/** One conversation as the message list renders it. */
export function useThread(key: ConversationKey): UseThreadResult {
  const client = useActiveClient();
  // A string, so callers may pass a fresh key object every render.
  const k = conversationKeyString(key);
  const sig = useMemo<ReadonlySignal<ThreadMessage[]>>(
    () => client?.chat.thread(parseConversationKey(k)) ?? NO_THREAD,
    [client, k],
  );
  const messages = useSignal(sig);
  const loadOlder = useCallback(
    (limit?: number) =>
      client
        ? client.chat.loadOlder(parseConversationKey(k), undefined, limit)
        : Promise.resolve([]),
    [client, k],
  );
  return { messages, loadOlder };
}

/**
 * Every sidebar row: enabled channels and direct conversations with
 * messages, each with its preview, unread count and favourite flag (node
 * favourites; channels have none). Filter and sort with
 * `filterConversations(rows, query, sidebarAccessors(title))`.
 */
export function useConversationSummaries(): readonly SidebarConversation[] {
  const client = useActiveClient();
  const summaries = useSignal(client?.chat.summaries ?? NO_SUMMARIES);
  const channels = useChannels();
  // Membership-only signals: telemetry and position updates don't change
  // them, so they don't rebuild the sidebar.
  const favorites = useSignal(client?.nodes.favoriteNums ?? NO_NODES);
  const ignored = useSignal(client?.nodes.ignoredNums ?? NO_NODES);
  const muted = useSignal(client?.nodes.mutedNums ?? NO_NODES);
  const [stabilize] = useState(createRowStabilizer);
  const channelSlots = useMemo(
    () =>
      channels.map((c) => ({
        index: c.index,
        enabled: c.role !== Protobuf.Channel.Channel_Role.DISABLED,
      })),
    [channels],
  );
  return useMemo(
    () =>
      stabilize(
        buildSidebarConversations({
          summaries,
          channels: channelSlots,
          isFavoriteNode: (num) => favorites.has(num),
          isHiddenNode: (num) => ignored.has(num),
          isMutedNode: (num) => muted.has(num),
        }),
      ),
    [stabilize, summaries, channelSlots, favorites, ignored, muted],
  );
}

export interface MessagingActions {
  sendText(input: SendTextInput): Promise<Result<number, SendTextError>>;
  sendReaction(
    input: SendReactionInput,
  ): Promise<Result<number, SendTextError>>;
  /** Removing my reaction is local only; see ChatClient.toggleReaction. */
  toggleReaction(
    input: SendReactionInput,
  ): Promise<Result<ToggleReactionOutcome, SendTextError>>;
  /** Sends a failed message or reaction again. */
  retry(id: number): Promise<Result<number, SendTextError>>;
  markRead(key: ConversationKey): void;
}

/**
 * Chat actions for the active connection. Without one, sends fail with
 * reason `not-connected` and `markRead` does nothing.
 */
export function useMessagingActions(): MessagingActions {
  const client = useActiveClient();
  return useMemo<MessagingActions>(() => {
    if (!client) {
      return {
        sendText: notConnected,
        sendReaction: notConnected,
        toggleReaction: notConnected,
        retry: notConnected,
        markRead: () => {},
      };
    }
    const chat = client.chat;
    return {
      sendText: (input) => chat.sendText(input),
      sendReaction: (input) => chat.sendReaction(input),
      toggleReaction: (input) => chat.toggleReaction(input),
      retry: (id) => chat.retry(id),
      markRead: (key) => chat.markRead(key),
    };
  }, [client]);
}

/** Muted node numbers on the active connection. */
export function useMutedNodeNums(): ReadonlySet<number> {
  const client = useActiveClient();
  return useSignal(client?.nodes.mutedNums ?? NO_NODES);
}
