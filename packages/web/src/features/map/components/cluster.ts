import type { Node } from "@data/schema";

export type ClusterKey = string;
export type PxOffset = [number, number];

export function makeClusterKey(node: Node): ClusterKey {
  return `${node.latitudeI},${node.longitudeI}`;
}

export function groupNodesByIdenticalCoords(
  nodes: Node[],
): Map<ClusterKey, Node[]> {
  const map = new Map<ClusterKey, Node[]>();
  for (const node of nodes) {
    if (node.latitudeI === null || node.longitudeI === null) {
      continue;
    }

    const key = makeClusterKey(node);
    const arr = map.get(key);
    if (arr) {
      arr.push(node);
    } else {
      map.set(key, [node]);
    }
  }
  return map;
}

export function hashToAngle(key: string): number {
  // djb2
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) + h + key.charCodeAt(i);
  }
  // Map to [0, 2π)
  return ((h >>> 0) % 360) * (Math.PI / 180);
}

export function fanOutOffsetsPx(size: number, key: string): Array<PxOffset> {
  const R = 10 + 5 * size; // radius in pixels
  const base = hashToAngle(key);
  const out: Array<PxOffset> = [];

  if (size === 1) {
    return [[0, 0]];
  }

  for (let i = 0; i < size; i++) {
    const theta = base + (i * 2 * Math.PI) / size;
    const dx = R * Math.cos(theta);
    const dy = R * Math.sin(theta);
    out.push([dx, dy]);
  }
  return out;
}
