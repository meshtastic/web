/**
 * Nodes that report the exact same coordinates stack on one map point.
 * Pure helpers to group them and fan a stack out into a ring of pixel
 * offsets so each one can be picked.
 */

export type ClusterKey = string;
export type PxOffset = [number, number];

/** Key shared by every item at exactly this `[lng, lat]`. */
export function makeClusterKey([lng, lat]: readonly [
  number,
  number,
]): ClusterKey {
  return `${lng},${lat}`;
}

/** Groups items by identical coordinates, keeping input order. */
export function groupByIdenticalCoords<T>(
  items: readonly T[],
  keyOf: (item: T) => ClusterKey | undefined,
): Map<ClusterKey, T[]> {
  const map = new Map<ClusterKey, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (key === undefined) {
      continue;
    }
    const arr = map.get(key);
    if (arr) {
      arr.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

/** Stable angle in [0, 2π) from a string (djb2), so a stack fans out the same way each time. */
export function hashToAngle(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) + h + key.charCodeAt(i);
  }
  return ((h >>> 0) % 360) * (Math.PI / 180);
}

/** Pixel offsets on a ring whose radius grows with the stack size. */
export function fanOutOffsetsPx(size: number, key: string): PxOffset[] {
  if (size <= 0) {
    return [];
  }
  if (size === 1) {
    return [[0, 0]];
  }
  const radius = 10 + 5 * size;
  const base = hashToAngle(key);
  const out: PxOffset[] = [];
  for (let i = 0; i < size; i++) {
    const theta = base + (i * 2 * Math.PI) / size;
    out.push([radius * Math.cos(theta), radius * Math.sin(theta)]);
  }
  return out;
}
