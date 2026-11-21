import type { NodeRow } from "./nodeRow.ts";
import {
  type SortAccessors,
  type SortDirection,
  type SortState,
  sortItems,
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

export const sortNodeRows = (
  rows: readonly NodeRow[],
  sort: SortState<NodeSortKey>,
  collator?: Intl.Collator,
): NodeRow[] =>
  sortItems(rows, NODE_SORT_ACCESSORS, sort, {
    collator,
    tiebreak: (a, b) => a.num - b.num,
  });
