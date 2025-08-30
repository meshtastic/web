export function evictOldestEntries<K, V>(
  map: Map<K, V>,
  maxSize: number,
): void {
  // while loop in case maxSize is ever changed to be lower, to trim all the way down
  while (map.size > maxSize) {
    const firstKey = map.keys().next().value; // maps keep insertion order, so this is oldest
    if (firstKey !== undefined) {
      map.delete(firstKey);
    } else {
      break; // should not happen, but just in case
    }
  }
}
