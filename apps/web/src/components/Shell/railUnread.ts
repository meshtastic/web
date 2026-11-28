import { isChannelMuted, type MutableChannel } from "@core/channels/mute.ts";
import {
  useChannels,
  useMutedNodeNums,
  useUnreadByKey,
  useUnreadMentionsByKey,
} from "@core/kmp/hooks";
import { mentionAttention } from "@core/messaging/conversations.ts";
import { conversationKeyString } from "@core/storage/types.ts";
import { useMemo } from "react";

/**
 * The unread total the rail and tab bar badge: every conversation's unread
 * count except muted channels', which the sidebar already shows
 * de-emphasised and which shouldn't pull attention to Messages. Unread
 * messages that @mention me still count in a muted channel, unless their
 * sender is a muted node.
 */
export const unreadExcludingMuted = (
  byKey: ReadonlyMap<string, number>,
  channels: readonly (MutableChannel & { readonly index: number })[],
  mentionsByKey: ReadonlyMap<string, readonly number[]> = new Map(),
  mutedNodes: ReadonlySet<number> = new Set(),
): number => {
  const muted = new Set(
    channels
      .filter((channel) => isChannelMuted(channel))
      .map((channel) =>
        conversationKeyString({ kind: "channel", channel: channel.index }),
      ),
  );
  let total = 0;
  for (const [key, count] of byKey) {
    total += muted.has(key)
      ? mentionAttention(mentionsByKey.get(key), (num) => mutedNodes.has(num))
      : count;
  }
  return total;
};

/** Live {@link unreadExcludingMuted} for the active connection. */
export function useRailUnread(): number {
  const byKey = useUnreadByKey();
  const channels = useChannels();
  const mentionsByKey = useUnreadMentionsByKey();
  const mutedNodes = useMutedNodeNums();
  return useMemo(
    () => unreadExcludingMuted(byKey, channels, mentionsByKey, mutedNodes),
    [byKey, channels, mentionsByKey, mutedNodes],
  );
}
