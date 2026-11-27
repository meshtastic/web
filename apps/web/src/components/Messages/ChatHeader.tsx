import { Button } from "@components/UI/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/UI/DropdownMenu.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { cn } from "@core/utils/cn.ts";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  BellOffIcon,
  EraserIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  LockIcon,
  LockOpenIcon,
  MapIcon,
  MapPinnedIcon,
  MoreVerticalIcon,
  SettingsIcon,
  TrashIcon,
  WaypointsIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export interface ChatHeaderIdentityProps {
  kind: "channel" | "dm";
  title: string;
  /** DM avatar. */
  initials?: string;
  nodeNum?: number;
  online?: boolean;
  /** A DM peer this radio can manage remotely: badge on the avatar. */
  adminAccess?: boolean;
  /** "Encrypted · Channel 0 · 243 nodes known", "End-to-end encrypted · 1 hop · heard 1 min ago". */
  subtitle: string;
  /** Private key (channel PSK or the peer's public key); open lock otherwise. */
  secure: boolean;
  /** Tooltip for the lock, e.g. why a DM isn't end-to-end encrypted. */
  lockTitle?: string;
  /** Narrow layout: back to the chat list. */
  backLabel?: string;
  /** A muted channel: bell-off icon after the name. */
  mutedLabel?: string;
}

/**
 * Left part of the conversation header: avatar, name and a status line.
 * Rendered in the page header's leading slot.
 */
export const ChatHeaderIdentity = ({
  kind,
  title,
  initials,
  nodeNum,
  online = false,
  adminAccess = false,
  subtitle,
  secure,
  lockTitle,
  backLabel,
  mutedLabel,
}: ChatHeaderIdentityProps) => {
  const Lock = secure ? LockIcon : LockOpenIcon;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 md:pl-2">
      {backLabel ? (
        <Link
          to="/messages"
          aria-label={backLabel}
          className="flex size-11 shrink-0 items-center justify-center rounded-card text-primary hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-5" />
        </Link>
      ) : null}
      {kind === "channel" ? (
        <NodeAvatar initials="#" tone={{ kind: "channel" }} size="sm" />
      ) : (
        <NodeAvatar
          initials={initials ?? ""}
          tone={{ kind: "node", nodeNum: nodeNum ?? 0 }}
          size="sm"
          presence={online ? "online" : undefined}
          cutout="app"
          adminAccess={adminAccess}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="m-0 flex min-w-0 items-center gap-1.5 text-header-lg font-semibold">
          <span className="truncate">{title}</span>
          {mutedLabel ? (
            <>
              <BellOffIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted"
              />
              <span className="sr-only">, {mutedLabel}</span>
            </>
          ) : null}
        </h2>
        <span className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
          <Lock
            aria-hidden="true"
            className={cn("size-3 shrink-0", !secure && "text-warning")}
          />
          <span className="truncate" title={lockTitle}>
            {subtitle}
          </span>
        </span>
      </div>
    </div>
  );
};

export interface ChatHeaderActionsProps {
  kind: "channel" | "dm";
  /** Narrow layout: everything goes in the overflow menu. */
  compact: boolean;
  connected: boolean;
  onTraceroute?: () => void;
  onRequestPosition?: () => void;
  /** Undefined when there is no position to show. */
  onShowOnMap?: () => void;
  onClearConversation: () => void;
  onDeleteAllMessages: () => void;
  onChannelSettings?: () => void;
  /** The message filter's entries for this conversation. */
  filter?: ChatHeaderFilterProps;
}

export interface ChatHeaderFilterProps {
  /** Filtering is on for the radio: offers the per-conversation toggle. */
  enabled: boolean;
  /** This conversation turned filtering off. */
  optedOut: boolean;
  /** Filtered messages loaded here: offers Show / Hide N filtered. */
  filteredCount: number;
  revealed: boolean;
  onOptedOutChange: (optedOut: boolean) => void;
  onRevealedChange: (revealed: boolean) => void;
  onOpenSettings: () => void;
}

/**
 * Right part of the conversation header, before the details toggle: DM
 * Traceroute / Request position, channel Show on map, and a menu with the
 * rest (clear this conversation, delete all messages, channel settings).
 */
export const ChatHeaderActions = ({
  kind,
  compact,
  connected,
  onTraceroute,
  onRequestPosition,
  onShowOnMap,
  onClearConversation,
  onDeleteAllMessages,
  onChannelSettings,
  filter,
}: ChatHeaderActionsProps) => {
  const { t } = useTranslation("messages");
  const dm = kind === "dm";
  const iconClass = "size-4";
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {dm && !compact && onTraceroute ? (
        <Button
          variant="outline"
          size="sm"
          disabled={!connected}
          icon={<WaypointsIcon aria-hidden="true" className={iconClass} />}
          onClick={onTraceroute}
        >
          {t("header.traceroute")}
        </Button>
      ) : null}
      {dm && !compact && onRequestPosition ? (
        <Button
          variant="outline"
          size="sm"
          disabled={!connected}
          icon={<MapPinnedIcon aria-hidden="true" className={iconClass} />}
          onClick={onRequestPosition}
        >
          {t("header.requestPosition")}
        </Button>
      ) : null}
      {!dm && !compact && onShowOnMap ? (
        <IconButton
          aria-label={t("header.showOnMap")}
          size="lg"
          icon={<MapIcon className="size-5" />}
          onClick={onShowOnMap}
        />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            aria-label={t("header.moreActions")}
            size={compact ? "touch" : "lg"}
            icon={<MoreVerticalIcon className="size-5" />}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {dm && compact && onTraceroute ? (
            <DropdownMenuItem
              disabled={!connected}
              onSelect={onTraceroute}
              className="gap-2"
            >
              <WaypointsIcon aria-hidden="true" className={iconClass} />
              {t("header.traceroute")}
            </DropdownMenuItem>
          ) : null}
          {dm && compact && onRequestPosition ? (
            <DropdownMenuItem
              disabled={!connected}
              onSelect={onRequestPosition}
              className="gap-2"
            >
              <MapPinnedIcon aria-hidden="true" className={iconClass} />
              {t("header.requestPosition")}
            </DropdownMenuItem>
          ) : null}
          {(compact || dm) && onShowOnMap ? (
            <DropdownMenuItem onSelect={onShowOnMap} className="gap-2">
              <MapIcon aria-hidden="true" className={iconClass} />
              {t("header.showOnMap")}
            </DropdownMenuItem>
          ) : null}
          {onChannelSettings ? (
            <DropdownMenuItem onSelect={onChannelSettings} className="gap-2">
              <SettingsIcon aria-hidden="true" className={iconClass} />
              {t("channelDetails.settings")}
            </DropdownMenuItem>
          ) : null}
          {filter ? (
            <>
              <DropdownMenuSeparator />
              {filter.enabled &&
              filter.filteredCount > 0 &&
              !filter.optedOut ? (
                <DropdownMenuItem
                  onSelect={() => filter.onRevealedChange(!filter.revealed)}
                  className="gap-2"
                >
                  {filter.revealed ? (
                    <EyeOffIcon aria-hidden="true" className={iconClass} />
                  ) : (
                    <EyeIcon aria-hidden="true" className={iconClass} />
                  )}
                  {filter.revealed
                    ? t("filter.hideFiltered", { count: filter.filteredCount })
                    : t("filter.showFiltered", { count: filter.filteredCount })}
                </DropdownMenuItem>
              ) : null}
              {filter.enabled ? (
                <DropdownMenuCheckboxItem
                  checked={!filter.optedOut}
                  onCheckedChange={(checked) =>
                    filter.onOptedOutChange(!checked)
                  }
                >
                  {t("filter.filterConversation")}
                </DropdownMenuCheckboxItem>
              ) : null}
              <DropdownMenuItem
                onSelect={filter.onOpenSettings}
                className="gap-2"
              >
                <FilterIcon aria-hidden="true" className={iconClass} />
                {t("filter.settings")}
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onClearConversation}
            className="gap-2 text-danger focus:text-danger"
          >
            <EraserIcon aria-hidden="true" className={iconClass} />
            {t("header.clearConversation")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={onDeleteAllMessages}
            className="gap-2 text-danger focus:text-danger"
          >
            <TrashIcon aria-hidden="true" className={iconClass} />
            {t("header.deleteAll")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
