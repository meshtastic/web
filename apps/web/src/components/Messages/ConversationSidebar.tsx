import { FilterChip } from "@components/UI/FilterChip.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { SearchTrigger } from "@components/UI/SearchTrigger.tsx";
import { SectionHeader } from "@components/UI/SectionHeader.tsx";
import {
  desktopSidebarFilters,
  mobileSidebarFilters,
  type SidebarFilter,
} from "@core/messaging/sidebarView.ts";
import { cn } from "@core/utils/cn.ts";
import { PencilLineIcon, PlusIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  ConversationRow,
  type ConversationRowView,
} from "./ConversationRow.tsx";

const filterLabelKeys = {
  all: "sidebar.filterAll",
  unread: "sidebar.filterUnread",
  favorites: "sidebar.filterFavorites",
  channels: "sidebar.filterChannels",
} as const satisfies Record<SidebarFilter, string>;

interface SidebarChromeProps {
  filter: SidebarFilter;
  onFilterChange: (filter: SidebarFilter) => void;
  /** Opens the command menu. */
  onOpenSearch: () => void;
  /** "⌘K" or "Ctrl K". */
  shortcut: string;
}

export type ConversationSidebarProps = SidebarChromeProps &
  (
    | {
        layout: "sections";
        channels: readonly ConversationRowView[];
        direct: readonly ConversationRowView[];
        onNewDirectMessage: () => void;
        onAddChannel: () => void;
      }
    | { layout: "mixed"; rows: readonly ConversationRowView[] }
  ) & {
    selectedId?: string;
  };

/**
 * The Messages sidebar (wide layout: title, new-DM button, search, chips,
 * Channels and Direct messages sections) or the Chats list (narrow layout:
 * search, chips with Channels, one list by recency).
 */
export const ConversationSidebar = (props: ConversationSidebarProps) => {
  const { t } = useTranslation("messages");
  const channelsId = useId();
  const directId = useId();
  const touch = props.layout === "mixed";
  const filters = touch ? mobileSidebarFilters : desktopSidebarFilters;

  const chips = (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
      <legend className="sr-only">{t("sidebar.filterLabel")}</legend>
      {filters.map((filter) => (
        <FilterChip
          key={filter}
          selected={props.filter === filter}
          onClick={() => props.onFilterChange(filter)}
          className={touch ? "px-3.5" : "h-[30px]"}
        >
          {t(filterLabelKeys[filter])}
        </FilterChip>
      ))}
    </fieldset>
  );

  const search = (
    <SearchTrigger
      label={touch ? t("sidebar.searchMobile") : t("sidebar.search")}
      shortcut={touch ? undefined : props.shortcut}
      onClick={props.onOpenSearch}
      className={cn(
        touch && "h-11 rounded-card border-0 bg-raised text-header",
      )}
    />
  );

  if (props.layout === "mixed") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-3 px-4 pt-3 pb-3">
          {search}
          {chips}
        </div>
        <nav
          aria-label={t("sidebar.chatsTitle")}
          className="min-h-0 flex-1 overflow-y-auto px-2"
        >
          {props.rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-help text-muted">
              {t("sidebar.emptyFilter")}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {props.rows.map((row) => (
                <li key={row.id}>
                  <ConversationRow
                    row={row}
                    selected={row.id === props.selectedId}
                    touch
                  />
                </li>
              ))}
            </ul>
          )}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 -mx-2 flex flex-col gap-3 bg-surface px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-title font-bold">{t("sidebar.title")}</h1>
          <IconButton
            aria-label={t("sidebar.newDm")}
            variant="secondary"
            icon={<PencilLineIcon className="size-[18px]" />}
            onClick={props.onNewDirectMessage}
          />
        </div>
        {search}
        {chips}
      </div>
      <nav aria-label={t("sidebar.title")} className="flex flex-col pb-2">
        <section aria-labelledby={channelsId}>
          <SectionHeader
            id={channelsId}
            title={t("sidebar.channels")}
            className="px-2 pt-2 pb-1"
            action={
              <IconButton
                aria-label={t("sidebar.addChannel")}
                size="xs"
                icon={<PlusIcon className="size-4" />}
                onClick={props.onAddChannel}
              />
            }
          />
          <ul className="m-0 list-none p-0">
            {props.channels.map((row) => (
              <li key={row.id}>
                <ConversationRow
                  row={row}
                  selected={row.id === props.selectedId}
                />
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby={directId}>
          <SectionHeader
            id={directId}
            title={t("sidebar.directMessages")}
            className="px-2 pt-4 pb-1"
          />
          {props.direct.length === 0 ? (
            <p className="m-0 px-2 py-2 text-help text-muted">
              {props.filter === "all"
                ? t("sidebar.noDirect")
                : t("sidebar.emptyFilter")}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {props.direct.map((row) => (
                <li key={row.id}>
                  <ConversationRow
                    row={row}
                    selected={row.id === props.selectedId}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </nav>
    </div>
  );
};
