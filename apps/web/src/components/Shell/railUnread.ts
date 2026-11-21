import { isChannelMuted, type MutableChannel } from "@core/channels/mute.ts";
import { useChannels, useUnreadByKey } from "@core/kmp/hooks";
import { conversationKeyString } from "@core/storage/types.ts";
import { useMemo } from "react";

/**
 * The unread total the rail and tab bar badge: every conversation's unread
 * count except muted channels', which the sidebar already shows
 * de-emphasised and which shouldn't pull attention to Messages.
 */
export const unreadExcludingMuted = (
  byKey: ReadonlyMap<string, number>,
  channels: readonly (MutableChannel & { readonly index: number })[],
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
    if (!muted.has(key)) {
      total += count;
    }
  }
  return total;
};

/** Live {@link unreadExcludingMuted} for the active connection. */
export function useRailUnread(): number {
  const byKey = useUnreadByKey();
  const channels = useChannels();
  return useMemo(
    () => unreadExcludingMuted(byKey, channels),
    [byKey, channels],
  );
}
