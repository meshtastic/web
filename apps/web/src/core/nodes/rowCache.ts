import type { NodeRow } from "./nodeRow.ts";

/**
 * Keeps row identity stable across node-list updates: a freshly built row
 * that equals the previous one for the same node is swapped for the old
 * object, so memoised table rows and pins skip re-rendering.
 */

type RowValue = NodeRow[keyof NodeRow];

const valuesEqual = (a: RowValue, b: RowValue): boolean => {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  if (
    typeof a === "object" &&
    typeof b === "object" &&
    a !== null &&
    b !== null &&
    "kind" in a &&
    "kind" in b
  ) {
    // BatteryInfo: compare by its serialised form (two small fields).
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
};

/** Field-by-field equality, comparing arrays and byte arrays by value. */
export const rowsEqual = (a: NodeRow, b: NodeRow): boolean => {
  const keys = new Set<keyof NodeRow>([
    ...Object.keys(a).filter((k): k is keyof NodeRow => k in a),
    ...Object.keys(b).filter((k): k is keyof NodeRow => k in b),
  ]);
  for (const key of keys) {
    if (!valuesEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
};

/**
 * `next`, with each row replaced by its previous object when nothing about
 * it changed. Returns `previous` itself when every row was reused in the
 * same order, so the array identity is stable too.
 */
export const reuseUnchangedRows = (
  previous: readonly NodeRow[],
  next: readonly NodeRow[],
): readonly NodeRow[] => {
  const byNum = new Map(previous.map((row) => [row.num, row]));
  let allSame = previous.length === next.length;
  const merged = next.map((row, index) => {
    const old = byNum.get(row.num);
    const kept = old && rowsEqual(old, row) ? old : row;
    if (kept !== previous[index]) {
      allSame = false;
    }
    return kept;
  });
  return allSame ? previous : merged;
};
