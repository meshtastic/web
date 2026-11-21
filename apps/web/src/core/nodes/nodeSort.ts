import type { NodeRow } from "./nodeRow.ts";
import {
  comparatorFor,
  type SortAccessors,
  type SortDirection,
  type SortState,
} from "./sort.ts";

export const NODE_SORT_KEYS = [
  "lastHeard",
  "name",
  "role",
  "hardware",
  "hops",
  "snr",
  "battery",
  "distance",
] as const;

export type NodeSortKey = (typeof NODE_SORT_KEYS)[number];

export const isNodeSortKey = (value: string): value is NodeSortKey =>
  NODE_SORT_KEYS.some((key) => key === value);

/** Direction a column starts in: "best first" for the measurements. */
export const NODE_SORT_INITIAL_DIRECTION = {
  lastHeard: "desc",
  name: "asc",
  role: "asc",
  hardware: "asc",
  hops: "asc",
  snr: "desc",
  battery: "desc",
  distance: "asc",
} as const satisfies Record<NodeSortKey, SortDirection>;

export const DEFAULT_NODE_SORT: SortState<NodeSortKey> = {
  key: "lastHeard",
  direction: "desc",
};

/** Plugged-in sorts above any battery level. */
const batterySortValue = (row: NodeRow): number | undefined => {
  if (!row.battery) {
    return undefined;
  }
  return row.battery.kind === "pluggedIn" ? 101 : row.battery.percent;
};

export const NODE_SORT_ACCESSORS: SortAccessors<NodeRow, NodeSortKey> = {
  lastHeard: (row) => row.lastHeardMs,
  name: (row) => row.name,
  role: (row) => row.role,
  hardware: (row) => row.hardware,
  hops: (row) => row.hops,
  snr: (row) => row.snr,
  battery: batterySortValue,
  distance: (row) => row.distanceMeters,
};

/**
 * A node list's sort: a column plus the "favourites first" modifier.
 *
 * Favourites-first is a modifier rather than its own key so it can sit in
 * front of any column ("Favourites, then last heard", "Favourites, then
 * name", ...) without a fake column in the table, and so flipping a column's
 * direction keeps favourites on top.
 */
export interface NodeListSort<
  K extends NodeSortKey = NodeSortKey,
> extends SortState<K> {
  readonly favoritesFirst: boolean;
}

/** Nodes page default: most recently heard first, favourites not pinned. */
export const DEFAULT_NODE_LIST_SORT: NodeListSort = {
  ...DEFAULT_NODE_SORT,
  favoritesFirst: false,
};

/** Favourites rank 0, the rest 1, so favourites lead in either direction. */
const favoriteRank = (row: NodeRow): number => (row.isFavorite ? 0 : 1);

/**
 * Sorted copy of `rows`. With `favoritesFirst`, favourites come first and
 * each group is ordered by the column; ties fall back to the node number so
 * rows don't jump between updates.
 */
export const sortNodeRows = (
  rows: readonly NodeRow[],
  sort: SortState<NodeSortKey> & { readonly favoritesFirst?: boolean },
  collator?: Intl.Collator,
): NodeRow[] => {
  const byColumn = comparatorFor(NODE_SORT_ACCESSORS, sort, {
    ...(collator ? { collator } : {}),
    tiebreak: (a, b) => a.num - b.num,
  });
  const compare = sort.favoritesFirst
    ? (a: NodeRow, b: NodeRow) =>
        favoriteRank(a) - favoriteRank(b) || byColumn(a, b)
    : byColumn;
  return [...rows].sort(compare);
};

/**
 * Columns the channel panel's "Recently heard" list can sort by. Role and
 * hardware are left out: the narrow list doesn't show them.
 */
export const CHANNEL_HEARD_SORT_KEYS = [
  "lastHeard",
  "name",
  "hops",
  "snr",
  "battery",
  "distance",
] as const satisfies readonly NodeSortKey[];

export type ChannelHeardSortKey = (typeof CHANNEL_HEARD_SORT_KEYS)[number];

export const isChannelHeardSortKey = (
  value: string,
): value is ChannelHeardSortKey =>
  CHANNEL_HEARD_SORT_KEYS.some((key) => key === value);

/** Channel panel default: most recently heard first, as before. */
export const DEFAULT_CHANNEL_HEARD_SORT: NodeListSort<ChannelHeardSortKey> = {
  key: "lastHeard",
  direction: "desc",
  favoritesFirst: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSortDirection = (value: unknown): value is SortDirection =>
  value === "asc" || value === "desc";

/**
 * A stored sort read back field by field. An unknown or missing column
 * falls back to the whole default; a bad direction falls back to the
 * column's natural one; a missing flag to the default's.
 */
export const parseNodeListSort = <K extends NodeSortKey>(
  value: unknown,
  isKey: (key: string) => key is K,
  fallback: NodeListSort<K>,
): NodeListSort<K> => {
  if (!isRecord(value)) {
    return fallback;
  }
  const { key, direction, favoritesFirst } = value;
  if (typeof key !== "string" || !isKey(key)) {
    return fallback;
  }
  return {
    key,
    direction: isSortDirection(direction)
      ? direction
      : NODE_SORT_INITIAL_DIRECTION[key],
    favoritesFirst:
      typeof favoritesFirst === "boolean"
        ? favoritesFirst
        : fallback.favoritesFirst,
  };
};

/** Each node list's own sort, kept as an app preference. */
export interface NodeListSorts {
  /** The Nodes page table and list. */
  readonly nodes: NodeListSort;
  /** A channel's "Recently heard" list in its details panel. */
  readonly channelHeard: NodeListSort<ChannelHeardSortKey>;
}

export type NodeListId = keyof NodeListSorts;

export const DEFAULT_NODE_LIST_SORTS: NodeListSorts = {
  nodes: DEFAULT_NODE_LIST_SORT,
  channelHeard: DEFAULT_CHANNEL_HEARD_SORT,
};

/** Stored list sorts, each list validated separately. */
export const parseNodeListSorts = (value: unknown): NodeListSorts => {
  const stored = isRecord(value) ? value : {};
  return {
    nodes: parseNodeListSort(
      stored.nodes,
      isNodeSortKey,
      DEFAULT_NODE_LIST_SORT,
    ),
    channelHeard: parseNodeListSort(
      stored.channelHeard,
      isChannelHeardSortKey,
      DEFAULT_CHANNEL_HEARD_SORT,
    ),
  };
};
