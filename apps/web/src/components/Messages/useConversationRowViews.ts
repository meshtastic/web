import { channelLabel } from "@core/channels/channelLabel.ts";
import { isChannelMuted } from "@core/channels/mute.ts";
import type { Channel } from "@core/kmp/channels.ts";
import type { SidebarConversation } from "@core/messaging/conversations.ts";
import { previewAuthor } from "@core/messaging/sidebarView.ts";
import { formatListTimestamp } from "@core/utils/timeFormat.ts";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConversationRowView } from "./ConversationRow.tsx";

/** What a DM row shows about its peer. */
export interface PeerPresence {
  readonly initials: string;
  readonly online: boolean;
  readonly adminAccess?: boolean;
}

export interface ConversationRowViewsInput {
  readonly channels: readonly Channel[];
  /** Stable while names don't change. */
  readonly nameOf: (nodeNum: number) => string;
  readonly peer: (nodeNum: number) => PeerPresence | undefined;
  readonly myNodeNum?: number;
  /** Epoch ms; rows only re-render when the minute changes. */
  readonly now: number;
}

const MINUTE_MS = 60_000;

interface CachedRow {
  readonly signature: string;
  readonly view: ConversationRowView;
}

/**
 * Sidebar row views for the conversation summaries. Each view is cached on
 * its summary object and rebuilt only when something it shows changes
 * (title, presence, mute, the minute for "time ago"), so memoised rows
 * skip re-rendering on every telemetry update.
 */
export function useConversationRowViews({
  channels,
  nameOf,
  peer,
  myNodeNum,
  now,
}: ConversationRowViewsInput) {
  const { t, i18n } = useTranslation("messages");
  const locale = i18n.language;
  const minute = Math.floor(now / MINUTE_MS) * MINUTE_MS;
  const [cache] = useState(() => new WeakMap<SidebarConversation, CachedRow>());
  const channelByIndex = useMemo(
    () => new Map(channels.map((c) => [c.index, c])),
    [channels],
  );

  const title = useCallback(
    (row: SidebarConversation): string => {
      if (row.target.kind === "dm") {
        return nameOf(row.target.peer);
      }
      const index = row.target.channel;
      return channelLabel(
        { index, name: channelByIndex.get(index)?.settings?.name },
        t,
      );
    },
    [channelByIndex, nameOf, t],
  );

  const toView = useCallback(
    (row: SidebarConversation): ConversationRowView => {
      const name = title(row);
      const presence =
        row.target.kind === "dm" ? peer(row.target.peer) : undefined;
      const muted =
        row.target.kind === "channel" &&
        isChannelMuted(channelByIndex.get(row.target.channel));
      const last = row.lastMessage;
      const author = previewAuthor(row, myNodeNum);
      const senderName = author.kind === "sender" ? nameOf(author.nodeNum) : "";
      const signature = [
        name,
        presence?.initials ?? "",
        presence?.online ?? "",
        presence?.adminAccess ?? "",
        muted,
        author.kind,
        senderName,
        minute,
        locale,
      ].join("\u0000");
      const hit = cache.get(row);
      if (hit && hit.signature === signature) {
        return hit.view;
      }
      const preview = last
        ? author.kind === "me"
          ? t("sidebar.previewYou", { text: last.excerpt })
          : author.kind === "sender"
            ? t("sidebar.previewSender", {
                name: senderName,
                text: last.excerpt,
              })
            : last.excerpt
        : undefined;
      const common = {
        id: row.id,
        title: name,
        unread: row.unread,
        favorite: row.favorite,
        muted,
        ...(preview === undefined ? {} : { preview }),
        ...(last
          ? { time: formatListTimestamp(last.rxTime, minute, locale) }
          : {}),
      };
      const view: ConversationRowView =
        row.target.kind === "channel"
          ? {
              ...common,
              kind: "channel",
              initials: "#",
              online: false,
              route: { type: "broadcast", chatId: row.target.channel },
            }
          : {
              ...common,
              kind: "dm",
              initials: presence?.initials ?? name.slice(0, 4),
              nodeNum: row.target.peer,
              online: presence?.online ?? false,
              adminAccess: presence?.adminAccess ?? false,
              route: { type: "direct", chatId: row.target.peer },
            };
      cache.set(row, { signature, view });
      return view;
    },
    [cache, channelByIndex, locale, minute, myNodeNum, nameOf, peer, t, title],
  );

  return { title, toView };
}
