/**
 * Shared sorting utilities for consistent ordering across the app.
 *
 * Sort order:
 * 1. Channels (sorted A-Z by name)
 * 2. Favorites (sorted A-Z by name)
 * 3. Recently heard (sorted by lastHeard descending)
 * 4. Never heard (sorted A-Z by name)
 */

export interface SortConfig<T> {
  getName: (item: T) => string;
  getLastHeard: (item: T) => number;
  isFavorite: (item: T) => boolean;
  isChannel?: (item: T) => boolean;
}

/**
 * Generic sort function that works with any data structure.
 * Sorts items in order: Channels -> Favorites -> Recently heard -> Never heard (A-Z)
 *
 * @param items - Array of items to sort
 * @param config - Configuration for extracting sort properties from items
 */
export function sortNodes<T>(items: T[], config: SortConfig<T>): T[] {
  const { getName, getLastHeard, isFavorite, isChannel } = config;

  const byName = (a: T, b: T) =>
    getName(a).localeCompare(getName(b), undefined, { numeric: true });
  const byLastHeardDesc = (a: T, b: T) => getLastHeard(b) - getLastHeard(a);

  const channels = isChannel ? items.filter(isChannel) : [];
  const nonChannels = isChannel ? items.filter((i) => !isChannel(i)) : items;

  const favorites = nonChannels.filter(isFavorite);
  const recentlyHeard = nonChannels.filter(
    (i) => !isFavorite(i) && getLastHeard(i) > 0,
  );
  const neverHeard = nonChannels.filter(
    (i) => !isFavorite(i) && getLastHeard(i) === 0,
  );

  return [
    ...channels.sort(byName),
    ...favorites.sort(byName),
    ...recentlyHeard.sort(byLastHeardDesc),
    ...neverHeard.sort(byName),
  ];
}
