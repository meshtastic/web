/**
 * Generic table sorting over typed column keys. Each column supplies an
 * accessor returning a string, number or `undefined`; unknown values sort
 * last whichever way the column is sorted, so "never heard" never floats to
 * the top of a descending list.
 */

export type SortDirection = "asc" | "desc";

export interface SortState<K extends string> {
  readonly key: K;
  readonly direction: SortDirection;
}

export type SortValue = string | number | undefined;

export type SortAccessors<T, K extends string> = {
  readonly [Key in K]: (item: T) => SortValue;
};

export interface SortOptions<T> {
  /** Compares strings; defaults to a base-sensitivity collator for "en". */
  readonly collator?: Intl.Collator;
  /** Breaks ties so equal rows keep a stable order across updates. */
  readonly tiebreak?: (a: T, b: T) => number;
}

/** Ascending comparison of two known values: numbers numerically, strings by collator. */
export const compareKnown = (
  a: string | number,
  b: string | number,
  collator: Intl.Collator,
): number => {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return collator.compare(String(a), String(b));
};

/** Comparator for one column; `undefined` always sorts after known values. */
export const comparatorFor = <T, K extends string>(
  accessors: SortAccessors<T, K>,
  sort: SortState<K>,
  options: SortOptions<T> = {},
): ((a: T, b: T) => number) => {
  const collator =
    options.collator ?? new Intl.Collator("en", { sensitivity: "base" });
  const accessor = accessors[sort.key];
  const sign = sort.direction === "asc" ? 1 : -1;
  return (a, b) => {
    const va = accessor(a);
    const vb = accessor(b);
    let result = 0;
    if (va === undefined && vb !== undefined) {
      return 1;
    }
    if (vb === undefined && va !== undefined) {
      return -1;
    }
    if (va !== undefined && vb !== undefined) {
      result = sign * compareKnown(va, vb, collator);
    }
    return result !== 0 ? result : (options.tiebreak?.(a, b) ?? 0);
  };
};

/** Sorted copy; the input is left alone. */
export const sortItems = <T, K extends string>(
  items: readonly T[],
  accessors: SortAccessors<T, K>,
  sort: SortState<K>,
  options: SortOptions<T> = {},
): T[] => [...items].sort(comparatorFor(accessors, sort, options));

/**
 * Next sort after a click on column `key`: the same column flips direction,
 * another column starts in its natural direction.
 */
export const nextSortState = <K extends string>(
  current: SortState<K>,
  key: K,
  initialDirection: Readonly<Record<K, SortDirection>>,
): SortState<K> =>
  current.key === key
    ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
    : { key, direction: initialDirection[key] };

/** `aria-sort` value for a column header. */
export const ariaSortFor = <K extends string>(
  sort: SortState<K>,
  key: K,
): "ascending" | "descending" | "none" =>
  sort.key !== key
    ? "none"
    : sort.direction === "asc"
      ? "ascending"
      : "descending";
