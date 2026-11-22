/**
 * Settings sidebar search: keeps the sections whose label (or extra search
 * terms, e.g. the subsection names inside Device configuration) contains
 * the query, case- and accent-insensitively, and drops groups left empty.
 */

export interface SearchableItem {
  readonly label: string;
  /** More text that should match, such as subsection names. */
  readonly terms?: readonly string[];
}

export interface ItemGroup<G, T> {
  readonly group: G;
  readonly items: readonly T[];
}

export const normalizeQuery = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();

export const matchesQuery = (item: SearchableItem, query: string): boolean => {
  const needle = normalizeQuery(query);
  if (needle === "") {
    return true;
  }
  return [item.label, ...(item.terms ?? [])].some((text) =>
    normalizeQuery(text).includes(needle),
  );
};

export const filterGroups = <G, T extends SearchableItem>(
  groups: readonly ItemGroup<G, T>[],
  query: string,
): ItemGroup<G, T>[] =>
  groups
    .map((group) => ({
      group: group.group,
      items: group.items.filter((item) => matchesQuery(item, query)),
    }))
    .filter((group) => group.items.length > 0);

/** Sections in display order, bucketed by group (in `groupOrder`). */
export const groupBy = <G extends string, T extends { readonly group: G }>(
  items: readonly T[],
  groupOrder: readonly G[],
): ItemGroup<G, T>[] =>
  groupOrder
    .map((group) => ({
      group,
      items: items.filter((item) => item.group === group),
    }))
    .filter((group) => group.items.length > 0);
