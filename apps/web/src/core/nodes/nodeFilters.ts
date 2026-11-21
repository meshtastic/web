import type { NodeRow } from "./nodeRow.ts";

/**
 * Quick filter chips on the Nodes screen. One is active at a time; the
 * advanced filter popover narrows further.
 */
export const NODE_QUICK_FILTERS = [
  "all",
  "favorites",
  "recent",
  "direct",
  "hasPosition",
] as const;

export type NodeQuickFilter = (typeof NODE_QUICK_FILTERS)[number];

export const isNodeQuickFilter = (value: string): value is NodeQuickFilter =>
  NODE_QUICK_FILTERS.some((filter) => filter === value);

export const matchesQuickFilter = (
  row: NodeRow,
  filter: NodeQuickFilter,
): boolean => {
  switch (filter) {
    case "all":
      return true;
    case "favorites":
      return row.isFavorite;
    case "recent":
      return row.isOnline;
    case "direct":
      return row.isDirect;
    case "hasPosition":
      return row.lngLat !== undefined;
  }
};

/**
 * Picking the active chip again goes back to "all", so a chip toggles like
 * the old favorites switch did.
 */
export const toggleQuickFilter = (
  current: NodeQuickFilter,
  picked: NodeQuickFilter,
): NodeQuickFilter => (current === picked ? "all" : picked);

/**
 * Case-insensitive match on long name, short name, `!id` (with or without
 * the `!`) and decimal node number.
 */
export const matchesNodeSearch = (row: NodeRow, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const hexNeedle = needle.replace(/^!/u, "");
  return (
    row.name.toLowerCase().includes(needle) ||
    (row.shortName?.toLowerCase().includes(needle) ?? false) ||
    (hexNeedle.length > 0 && row.id.slice(1).includes(hexNeedle)) ||
    String(row.num).includes(needle)
  );
};

/** Counts per chip, for the chips' badges. */
export const countByQuickFilter = (
  rows: readonly NodeRow[],
): Record<NodeQuickFilter, number> => {
  const counts: Record<NodeQuickFilter, number> = {
    all: 0,
    favorites: 0,
    recent: 0,
    direct: 0,
    hasPosition: 0,
  };
  for (const row of rows) {
    for (const filter of NODE_QUICK_FILTERS) {
      if (matchesQuickFilter(row, filter)) {
        counts[filter] += 1;
      }
    }
  }
  return counts;
};
