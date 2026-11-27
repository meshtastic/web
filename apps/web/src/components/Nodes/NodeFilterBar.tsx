import { FilterChip } from "@components/UI/FilterChip.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import { SearchField } from "@components/UI/SearchField.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/UI/Select.tsx";
import {
  NODE_QUICK_FILTERS,
  type NodeQuickFilter,
} from "@core/nodes/nodeFilters.ts";
import {
  isNodeSortKey,
  NODE_SORT_KEYS,
  type NodeSortKey,
} from "@core/nodes/nodeSort.ts";
import { cn } from "@core/utils/cn.ts";
import { StarIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface NodeFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  quickFilter: NodeQuickFilter;
  onQuickFilterChange: (filter: NodeQuickFilter) => void;
  /** Rows per chip, shown as the chip's count. */
  counts?: Readonly<Record<NodeQuickFilter, number>>;
  sortKey: NodeSortKey;
  onSortKeyChange: (key: NodeSortKey) => void;
  /** Favourites lead the list, each group in the chosen sort. */
  favoritesFirst: boolean;
  onFavoritesFirstChange: (favoritesFirst: boolean) => void;
  /** The advanced filter popover trigger. */
  moreFilters?: ReactNode;
  className?: string;
}

/**
 * Search, quick filter chips and sort for the node list, per the Nodes
 * design. Chips are toggle buttons: one is active, picking it again clears it.
 */
export const NodeFilterBar = ({
  search,
  onSearchChange,
  quickFilter,
  onQuickFilterChange,
  counts,
  sortKey,
  onSortKeyChange,
  favoritesFirst,
  onFavoritesFirstChange,
  moreFilters,
  className,
}: NodeFilterBarProps) => {
  const { t } = useTranslation("nodes");
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      <SearchField
        label={t("page.searchLabel")}
        placeholder={t("page.searchPlaceholder")}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        containerClassName="min-w-0 flex-[1_1_280px]"
      />
      {/* Touch: room between wrapped rows for each chip's 44px hit area. */}
      <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0 pointer-coarse:gap-y-3">
        <legend className="sr-only">{t("page.filtersLabel")}</legend>
        {NODE_QUICK_FILTERS.map((filter) => (
          <FilterChip
            key={filter}
            selected={quickFilter === filter}
            count={filter === "all" ? undefined : counts?.[filter]}
            onClick={() => onQuickFilterChange(filter)}
          >
            {t(`quickFilter.${filter}`)}
          </FilterChip>
        ))}
      </fieldset>
      <div className="flex items-center gap-2">
        <Select
          value={sortKey}
          onValueChange={(value) => {
            if (isNodeSortKey(value)) {
              onSortKeyChange(value);
            }
          }}
        >
          <SelectTrigger
            aria-label={t("page.sortLabel")}
            className="h-9 w-auto min-w-40 text-help font-medium"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NODE_SORT_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {t("page.sortBy", { column: t(`column.${key}`) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconButton
          aria-label={t("page.favoritesFirst")}
          title={t("page.favoritesFirst")}
          aria-pressed={favoritesFirst}
          onClick={() => onFavoritesFirstChange(!favoritesFirst)}
          icon={
            <StarIcon
              className={cn("size-4", favoritesFirst && "fill-current")}
            />
          }
          className={cn(
            "border border-input bg-app text-muted hover:bg-raised hover:text-primary",
            favoritesFirst &&
              "border-accent bg-accent-tint text-accent hover:bg-accent-tint hover:text-accent",
          )}
        />
        {moreFilters}
      </div>
    </div>
  );
};
