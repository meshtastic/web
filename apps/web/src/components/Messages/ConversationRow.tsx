import { CountBadge } from "@components/UI/CountBadge.tsx";
import { listRowVariants } from "@components/UI/ListRow.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { cn } from "@core/utils/cn.ts";
import { Link } from "@tanstack/react-router";
import { BellOffIcon, StarIcon } from "lucide-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";

/** One sidebar row, resolved for display. */
export interface ConversationRowView {
  readonly id: string;
  readonly kind: "channel" | "dm";
  readonly title: string;
  /** Avatar text: "#" for a channel, the node's initials for a DM. */
  readonly initials: string;
  /** The peer, for a DM's avatar colour. */
  readonly nodeNum?: number;
  readonly online: boolean;
  readonly favorite: boolean;
  /** A DM peer this radio can manage remotely. */
  readonly adminAccess?: boolean;
  /** A muted channel: bell-off icon, unread count de-emphasised. */
  readonly muted: boolean;
  /**
   * An unread message @mentions me (from a node that isn't muted): an `@`
   * badge, and full emphasis even in a muted channel.
   */
  readonly mentioned?: boolean;
  /** Last message, prefixed with "You:" or the channel sender. */
  readonly preview?: string;
  readonly time?: string;
  readonly unread: number;
  readonly route: {
    readonly type: "broadcast" | "direct";
    readonly chatId: number;
  };
}

export interface ConversationRowProps {
  row: ConversationRowView;
  selected: boolean;
  /** Narrow layout: 48px avatars, dividers, 15px titles. */
  touch?: boolean;
}

/**
 * A channel or DM in the conversation list: avatar (with an online dot for
 * DMs), name, time, last-message preview and unread badge.
 */
export const ConversationRow = memo(function ConversationRow({
  row,
  selected,
  touch = false,
}: ConversationRowProps) {
  const { t } = useTranslation("messages");
  const isChannel = row.kind === "channel";
  // A mention of me breaks through the channel's mute.
  const quiet = row.muted && !row.mentioned;
  const emphasised = row.unread > 0 && !quiet;
  return (
    <Link
      to="/messages/$type/$chatId"
      params={{ type: row.route.type, chatId: row.route.chatId }}
      aria-current={selected ? "page" : undefined}
      className={cn(
        listRowVariants({ selected }),
        touch && "min-h-16 rounded-none border-b border-subtle px-2",
      )}
    >
      {isChannel ? (
        <NodeAvatar
          initials="#"
          tone={{ kind: "channel" }}
          size={touch ? "lg" : "md"}
          className={touch ? "text-title" : undefined}
        />
      ) : (
        <NodeAvatar
          initials={row.initials}
          tone={{ kind: "node", nodeNum: row.nodeNum ?? 0 }}
          size={touch ? "lg" : "md"}
          presence={row.online ? "online" : undefined}
          cutout={selected ? "selected" : "surface"}
          adminAccess={row.adminAccess}
        >
          {row.favorite ? (
            <span className="absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full bg-surface text-warning">
              <StarIcon aria-hidden="true" className="size-2.5 fill-current" />
            </span>
          ) : null}
        </NodeAvatar>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn("truncate font-semibold", touch && "text-header")}
          >
            {row.title}
            {row.muted ? (
              <>
                <BellOffIcon
                  aria-hidden="true"
                  className="ml-1.5 inline size-3.5 align-[-2px] text-muted"
                />
                <span className="sr-only">, {t("channelDetails.muted")}</span>
              </>
            ) : null}
            {row.favorite ? (
              <span className="sr-only">, {t("sidebar.filterFavorites")}</span>
            ) : null}
          </span>
          {row.time ? (
            <span
              className={cn(
                "shrink-0 text-meta whitespace-nowrap",
                emphasised ? "text-accent" : "text-muted",
              )}
            >
              {row.time}
            </span>
          ) : null}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate",
              touch ? "text-body" : "text-help",
              emphasised ? "text-secondary" : "text-muted",
            )}
          >
            {row.preview ?? t("sidebar.noMessages")}
          </span>
          {row.mentioned ? (
            <span
              data-mention-badge=""
              className={cn(
                "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-meta font-bold text-on-accent",
                touch && "h-[22px] min-w-[22px]",
              )}
            >
              <span aria-hidden="true">@</span>
              <span className="sr-only">{t("mentions.sidebarMention")}</span>
            </span>
          ) : null}
          <CountBadge
            count={row.unread}
            className={cn(
              touch && "h-[22px] min-w-[22px]",
              quiet && "bg-raised font-semibold text-muted",
            )}
          />
        </span>
      </span>
    </Link>
  );
});
