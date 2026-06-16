export function evictOldestEntries<T>(arr: T[], maxSize: number): void;
export function evictOldestEntries<K, V>(map: Map<K, V>, maxSize: number): void;

export function evictOldestEntries<T, K, V>(
  collection: T[] | Map<K, V>,
  maxSize: number,
): void {
  if (Array.isArray(collection)) {
    // Trim array from the front (assuming oldest entries are at the start)
    while (collection.length > maxSize) {
      collection.shift();
    }
  } else if (collection instanceof Map) {
    // Trim map by insertion order
    while (collection.size > maxSize) {
      const firstKey = collection.keys().next().value;
      if (firstKey !== undefined) {
        collection.delete(firstKey);
      } else {
        break;
      }
    }
  }
}
