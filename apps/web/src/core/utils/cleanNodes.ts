import type { Node } from "@meshtastic/sdk";

export const MIN_DAYS_KNOWN = 7;
export const MIN_DAYS_UNKNOWN = 0;
export const MAX_DAYS = 365;

const SECONDS_PER_DAY = 24 * 60 * 60;

export interface CleanNodesCriteria {
  olderThanDays: number;
  /** Only nodes that never sent their user info (no long name). */
  onlyUnknown: boolean;
  nowSeconds: number;
  myNodeNum?: number;
}

export const isUnknownNode = (node: Node): boolean => !node.user?.longName;

/**
 * The nodes Android's "Clean node database" would remove: last heard before
 * the cut-off (never heard counts as old), optionally only unknown ones. Our
 * own node, favourites and ignored nodes are always kept, since removing an
 * ignored node would forget that it's ignored.
 */
export function nodesToClean(
  nodes: Iterable<Node>,
  criteria: CleanNodesCriteria,
): Node[] {
  const cutoff =
    criteria.nowSeconds - Math.floor(criteria.olderThanDays) * SECONDS_PER_DAY;
  return [...nodes].filter(
    (node) =>
      node.num !== criteria.myNodeNum &&
      !node.isFavorite &&
      !node.isIgnored &&
      (node.lastHeard ?? 0) < cutoff &&
      (!criteria.onlyUnknown || isUnknownNode(node)),
  );
}

/** The slider's lower bound: unknown-only cleaning may go down to 0 days. */
export const minDays = (onlyUnknown: boolean): number =>
  onlyUnknown ? MIN_DAYS_UNKNOWN : MIN_DAYS_KNOWN;
