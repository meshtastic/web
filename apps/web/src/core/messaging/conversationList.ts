/**
 * Filtering and ordering for the conversation sidebar (filter chips plus
 * search). Generic over the row type: callers say how to read each field.
 */

export const conversationFilters = ["all", "unread", "favorites"] as const;
export type ConversationFilter = (typeof conversationFilters)[number];

export interface ConversationAccessors<T> {
  readonly unreadCount: (item: T) => number;
  readonly isFavorite: (item: T) => boolean;
  /** Text the search box matches against (names, ids, last message). */
  readonly searchText: (item: T) => ReadonlyArray<string | null | undefined>;
  /** Epoch milliseconds of the latest message; undefined sorts last. */
  readonly lastActivity: (item: T) => number | undefined;
  /** Tie-breaker for equal activity. */
  readonly name: (item: T) => string;
}

export interface ConversationQuery {
  readonly filter: ConversationFilter;
  readonly search: string;
}

/** Lower-case, accent-free form for forgiving matches ("Zürich" ~ "zurich"). */
export const normalizeForSearch = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();

/**
 * Every whitespace-separated term of `search` must appear in at least one
 * field. An empty search matches everything.
 */
export const matchesSearch = (
  fields: ReadonlyArray<string | null | undefined>,
  search: string,
): boolean => {
  const terms = normalizeForSearch(search).split(/\s+/u).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }
  const haystack = fields
    .filter((field): field is string => typeof field === "string")
    .map(normalizeForSearch);
  return terms.every((term) => haystack.some((field) => field.includes(term)));
};

export const passesFilter = <T>(
  item: T,
  filter: ConversationFilter,
  accessors: ConversationAccessors<T>,
): boolean => {
  switch (filter) {
    case "all":
      return true;
    case "unread":
      return accessors.unreadCount(item) > 0;
    case "favorites":
      return accessors.isFavorite(item);
  }
};

/** Most recent activity first; rows with no messages last, by name. */
export const compareConversations =
  <T>(accessors: ConversationAccessors<T>) =>
  (a: T, b: T): number => {
    const ta = accessors.lastActivity(a);
    const tb = accessors.lastActivity(b);
    if (ta !== tb) {
      if (ta === undefined) {
        return 1;
      }
      if (tb === undefined) {
        return -1;
      }
      return tb - ta;
    }
    return accessors.name(a).localeCompare(accessors.name(b));
  };

export const filterConversations = <T>(
  items: readonly T[],
  query: ConversationQuery,
  accessors: ConversationAccessors<T>,
): T[] =>
  items
    .filter(
      (item) =>
        passesFilter(item, query.filter, accessors) &&
        matchesSearch(accessors.searchText(item), query.search),
    )
    .sort(compareConversations(accessors));

/** How many rows each chip would show, ignoring search. */
export const countByFilter = <T>(
  items: readonly T[],
  accessors: ConversationAccessors<T>,
): Record<ConversationFilter, number> => ({
  all: items.length,
  unread: items.filter((item) => passesFilter(item, "unread", accessors))
    .length,
  favorites: items.filter((item) => passesFilter(item, "favorites", accessors))
    .length,
});
