import { NodeDetailsPanel } from "@components/Nodes/NodeDetailsPanel.tsx";
import type { AdminAccessControl } from "@components/Nodes/useAdminAccess.ts";
import type { NodeActions } from "@components/Nodes/useNodeActions.ts";
import type { NodeLabels } from "@components/Nodes/useNodeLabels.ts";
import { Button } from "@components/UI/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/UI/DropdownMenu.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { KeyValue, KeyValueList } from "@components/UI/KeyValue.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import { SearchField } from "@components/UI/SearchField.tsx";
import { SectionHeader } from "@components/UI/SectionHeader.tsx";
import type { ChannelEncryption } from "@core/messaging/channelInfo.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import {
  CHANNEL_HEARD_SORT_KEYS,
  type ChannelHeardSortKey,
  isChannelHeardSortKey,
  NODE_SORT_INITIAL_DIRECTION,
  type NodeListSort,
} from "@core/nodes/nodeSort.ts";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownUpIcon,
  QrCodeIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface DetailsFrameProps {
  title: string;
  /** Closes the panel; omitted where the drawer has its own close button. */
  onClose?: () => void;
  children: ReactNode;
}

/** 64px titled header with a close button over the panel's content. */
const DetailsFrame = ({ title, onClose, children }: DetailsFrameProps) => {
  const { t } = useTranslation("messages");
  return (
    <div className="-mx-2 flex min-h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-subtle px-4">
        <h2 className="m-0 text-header font-semibold">{title}</h2>
        {onClose ? (
          <IconButton
            aria-label={t("header.closeDetails")}
            icon={<XIcon className="size-[18px]" />}
            onClick={onClose}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
};

const encryptionKeys = {
  none: "channelDetails.encNone",
  defaultKey: "channelDetails.encDefault",
  aes128: "channelDetails.encAes128",
  aes256: "channelDetails.encAes256",
} as const satisfies Record<ChannelEncryption, string>;

export interface HeardNodeView {
  readonly num: number;
  readonly name: string;
  readonly initials: string;
  readonly isFavorite: boolean;
  /** This radio can manage the node remotely. */
  readonly hasAdminAccess?: boolean;
  /** "2 hops · 3m". */
  readonly meta: string;
}

type ChannelHeardSort = NodeListSort<ChannelHeardSortKey>;

interface HeardSortMenuProps {
  sort: ChannelHeardSort;
  onSortChange: (sort: ChannelHeardSort) => void;
}

/**
 * Compact sort control for the narrow "Recently heard" header: the column
 * as a radio group and "Favorites first" as a modifier in front of it.
 */
const HeardSortMenu = ({ sort, onSortChange }: HeardSortMenuProps) => {
  const { t } = useTranslation("messages");
  const column = t(`column.${sort.key}`, { ns: "nodes" });
  const summary = sort.favoritesFirst
    ? t("channelDetails.sortFavoritesThen", { column })
    : column;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("channelDetails.sortCurrent", { sort: summary })}
        title={summary}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted pointer-coarse:touch-target hover:bg-raised hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[state=open]:bg-raised data-[state=open]:text-primary"
      >
        {/* An icon like the search button beside it; the sort is in the
            accessible name and the tooltip. */}
        {sort.favoritesFirst ? (
          <StarIcon
            aria-hidden="true"
            className="size-5 fill-current text-accent"
          />
        ) : (
          <ArrowDownUpIcon aria-hidden="true" className="size-5" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>{t("channelDetails.sortBy")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sort.key}
          onValueChange={(value) => {
            if (isChannelHeardSortKey(value)) {
              onSortChange({
                key: value,
                direction: NODE_SORT_INITIAL_DIRECTION[value],
                favoritesFirst: sort.favoritesFirst,
              });
            }
          }}
        >
          {CHANNEL_HEARD_SORT_KEYS.map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {t(`column.${key}`, { ns: "nodes" })}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={sort.favoritesFirst}
          onCheckedChange={(checked) =>
            onSortChange({ ...sort, favoritesFirst: checked })
          }
          // Stay open so the column can be picked next.
          onSelect={(event) => event.preventDefault()}
        >
          {t("page.favoritesFirst", { ns: "nodes" })}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface HeardSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
}

/** The search field that stands in for the header row while open. */
const HeardSearch = ({ query, onQueryChange, onClose }: HeardSearchProps) => {
  const { t } = useTranslation("messages");
  const field = useRef<HTMLInputElement>(null);
  // Opened on purpose from the icon, so the field takes focus at once.
  useEffect(() => {
    field.current?.focus();
  }, []);
  return (
    <div className="flex items-center gap-1">
      <SearchField
        ref={field}
        label={t("channelDetails.searchHeard")}
        containerClassName="h-9 flex-1"
        // The close button beside it clears too; one ✕ is enough.
        className="[&::-webkit-search-cancel-button]:appearance-none"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
      />
      <IconButton
        size="sm"
        aria-label={t("channelDetails.closeSearch")}
        icon={<XIcon className="size-4" />}
        onClick={onClose}
      />
    </div>
  );
};

export interface ChannelDetailsPanelProps {
  primary: boolean;
  encryption: ChannelEncryption;
  muted: boolean;
  heard: readonly HeardNodeView[];
  /** How `heard` is ordered; the list arrives already sorted. */
  heardSort: ChannelHeardSort;
  onHeardSortChange: (sort: ChannelHeardSort) => void;
  /** Search over the recently heard list; `heard` arrives already filtered. */
  heardQuery: string;
  onHeardQueryChange: (query: string) => void;
  /** Nodes heard before the search, to tell "none heard" from "none match". */
  heardTotal: number;
  /** Every node this radio knows, for "View all N nodes". */
  totalNodes: number;
  onShareQr: () => void;
  onOpenNode: (nodeNum: number) => void;
  onClose?: () => void;
}

/**
 * The channel's role and encryption, a QR share and its settings, and the
 * nodes heard on it in the last two hours.
 */
export const ChannelDetailsPanel = ({
  primary,
  encryption,
  muted,
  heard,
  heardSort,
  onHeardSortChange,
  heardQuery,
  onHeardQueryChange,
  heardTotal,
  totalNodes,
  onShareQr,
  onOpenNode,
  onClose,
}: ChannelDetailsPanelProps) => {
  const { t } = useTranslation("messages");
  const heardId = useId();
  const [searching, setSearching] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  // The icon comes back when the field closes; focus goes back to it.
  useEffect(() => {
    if (!searching && returnFocus.current) {
      returnFocus.current = false;
      searchButton.current?.focus();
    }
  }, [searching]);
  const closeSearch = () => {
    returnFocus.current = true;
    setSearching(false);
    onHeardQueryChange("");
  };
  return (
    <DetailsFrame title={t("header.channelDetails")} onClose={onClose}>
      <div className="flex flex-col gap-3 border-b border-subtle p-4">
        <KeyValueList className="grid grid-cols-2 gap-2">
          <KeyValue
            variant="tile"
            label={t("channelDetails.role")}
            value={
              primary
                ? t("channelDetails.rolePrimary")
                : t("channelDetails.roleSecondary")
            }
          />
          <KeyValue
            variant="tile"
            label={t("channelDetails.encryption")}
            value={t(encryptionKeys[encryption])}
          />
        </KeyValueList>
        {muted ? (
          <p className="m-0 text-help text-muted">
            {t("channelDetails.muted")}
          </p>
        ) : null}
        {/* Side by side when both labels fit, stacked when they don't. */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-[1_1_auto] whitespace-nowrap"
            icon={<QrCodeIcon aria-hidden="true" className="size-4" />}
            onClick={onShareQr}
          >
            {t("channelDetails.shareQr")}
          </Button>
          <Link
            to="/settings/channels"
            className="inline-flex h-9 flex-[1_1_auto] items-center justify-center gap-2 whitespace-nowrap rounded-control border border-control px-3 text-help font-medium text-primary hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <SettingsIcon aria-hidden="true" className="size-4" />
            {t("channelDetails.settings")}
          </Link>
        </div>
      </div>
      <section
        aria-labelledby={heardId}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="px-4 pt-3.5 pb-1.5">
          {searching ? (
            <>
              <h3 id={heardId} className="sr-only">
                {t("channelDetails.recentlyHeard")}
              </h3>
              <HeardSearch
                query={heardQuery}
                onQueryChange={onHeardQueryChange}
                onClose={closeSearch}
              />
            </>
          ) : (
            <SectionHeader
              id={heardId}
              as="h3"
              title={t("channelDetails.recentlyHeard")}
              action={
                <div className="flex items-center gap-1">
                  {heardTotal > 0 ? (
                    <IconButton
                      ref={searchButton}
                      size="sm"
                      aria-label={t("channelDetails.searchHeard")}
                      aria-expanded={false}
                      icon={<SearchIcon className="size-5" />}
                      onClick={() => setSearching(true)}
                    />
                  ) : null}
                  <HeardSortMenu
                    sort={heardSort}
                    onSortChange={onHeardSortChange}
                  />
                </div>
              }
            />
          )}
          <p className="m-0 text-meta text-muted">
            {t("channelDetails.window")}
          </p>
        </div>
        {heard.length === 0 ? (
          <p className="m-0 px-4 py-2 text-help text-muted">
            {heardTotal > 0 && heardQuery.trim() !== ""
              ? t("channelDetails.noHeardMatch", { query: heardQuery.trim() })
              : t("channelDetails.noneHeard")}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0 px-2">
            {heard.map((node) => (
              <li key={node.num}>
                <button
                  type="button"
                  aria-label={[
                    t("channelDetails.messageNode", { name: node.name }),
                    node.isFavorite
                      ? t("value.favorite", { ns: "nodes" })
                      : undefined,
                    node.hasAdminAccess
                      ? t("avatar.adminAccess", { ns: "nodes" })
                      : undefined,
                    node.meta,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  onClick={() => onOpenNode(node.num)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <NodeAvatar
                    initials={node.initials}
                    tone={{ kind: "node", nodeNum: node.num }}
                    size="xs"
                    adminAccess={node.hasAdminAccess}
                  >
                    {node.isFavorite ? (
                      <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-surface text-warning">
                        <StarIcon
                          aria-hidden="true"
                          className="size-2.5 fill-current"
                        />
                      </span>
                    ) : null}
                  </NodeAvatar>
                  {/* Name over meta, so a long meta can't squeeze the name. */}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{node.name}</span>
                    <span className="truncate text-meta text-muted">
                      {node.meta}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="px-4 pt-3 pb-4">
        <Link
          to="/nodes"
          className="flex h-10 items-center justify-center rounded-control bg-raised font-medium text-primary hover:bg-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t("channelDetails.viewAllNodes", { count: totalNodes })}
        </Link>
      </div>
    </DetailsFrame>
  );
};

export interface DirectDetailsPanelProps {
  row: NodeRow | undefined;
  labels: NodeLabels;
  actions: NodeActions;
  adminAccess?: AdminAccessControl;
  /** Shown when the peer isn't in the node DB. */
  fallbackName: string;
  fallbackId: string;
  onClose?: () => void;
}

/** The peer's node details (the Nodes screen's panel) under a "Node details" header. */
export const DirectDetailsPanel = ({
  row,
  labels,
  actions,
  adminAccess,
  fallbackName,
  fallbackId,
  onClose,
}: DirectDetailsPanelProps) => {
  const { t } = useTranslation("messages");
  return (
    <DetailsFrame title={t("header.nodeDetails")} onClose={onClose}>
      {row ? (
        <NodeDetailsPanel
          row={row}
          labels={labels}
          actions={actions}
          adminAccess={adminAccess}
        />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          <p className="m-0 text-header-lg font-bold">{fallbackName}</p>
          <KeyValueList>
            <KeyValue
              label={t("details.nodeId", { ns: "nodes" })}
              value={fallbackId}
              mono
            />
          </KeyValueList>
        </div>
      )}
    </DetailsFrame>
  );
};
