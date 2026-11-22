import type { LngLat } from "@core/utils/geo.ts";
import {
  type ClusterKey,
  fanOutOffsetsPx,
  groupByIdenticalCoords,
  makeClusterKey,
  type PxOffset,
} from "./cluster.ts";

/**
 * Map pin model: which node pins to draw, where, and how. Nodes at the
 * same coordinates form a stack; a collapsed stack draws only its top pin
 * plus a "+N" badge, an expanded one fans every pin out on a ring.
 */

export interface PinSource {
  readonly num: number;
  readonly lngLat?: LngLat;
}

export type PinTone = "selected" | "self" | "default";

export interface MapPin {
  readonly num: number;
  readonly lngLat: LngLat;
  readonly offsetPx: PxOffset;
  readonly clusterKey: ClusterKey;
  readonly isSelf: boolean;
  readonly isSelected: boolean;
  readonly tone: PinTone;
}

export interface MapStack {
  readonly clusterKey: ClusterKey;
  readonly lngLat: LngLat;
  /** Pins hidden under the top one. */
  readonly hiddenCount: number;
}

export interface PinModel {
  /** Draw order: the selected pin last, so it sits on top. */
  readonly pins: readonly MapPin[];
  /** Badges for collapsed stacks. */
  readonly stacks: readonly MapStack[];
}

export interface PinOptions {
  readonly myNodeNum?: number;
  readonly selectedNum?: number;
  readonly expandedCluster?: ClusterKey;
}

const toneFor = (isSelected: boolean, isSelf: boolean): PinTone =>
  isSelected ? "selected" : isSelf ? "self" : "default";

/**
 * In a collapsed stack the selected node (else this device, else the first
 * node) stays on top so it is the one you see.
 */
const headOf = <T extends PinSource>(
  members: readonly T[],
  options: PinOptions,
): T | undefined =>
  members.find((m) => m.num === options.selectedNum) ??
  members.find((m) => m.num === options.myNodeNum) ??
  members[0];

export function derivePins<T extends PinSource>(
  nodes: readonly T[],
  options: PinOptions = {},
): PinModel {
  // A node listed twice (say, this device from two sources) gets one pin.
  const seen = new Set<number>();
  const unique = nodes.filter((node) => {
    if (seen.has(node.num)) {
      return false;
    }
    seen.add(node.num);
    return true;
  });
  const clusters = groupByIdenticalCoords(unique, (node) =>
    node.lngLat ? makeClusterKey(node.lngLat) : undefined,
  );

  const pins: MapPin[] = [];
  const stacks: MapStack[] = [];

  for (const [clusterKey, members] of clusters) {
    const head = headOf(members, options);
    if (!head?.lngLat) {
      continue;
    }
    const lngLat = head.lngLat;
    const expanded =
      members.length > 1 && options.expandedCluster === clusterKey;
    const shown = expanded ? members : [head];
    const offsets = expanded
      ? fanOutOffsetsPx(members.length, clusterKey)
      : undefined;

    shown.forEach((node, index) => {
      const isSelected = node.num === options.selectedNum;
      const isSelf = node.num === options.myNodeNum;
      pins.push({
        num: node.num,
        lngLat,
        offsetPx: offsets?.[index] ?? [0, 0],
        clusterKey,
        isSelf,
        isSelected,
        tone: toneFor(isSelected, isSelf),
      });
    });

    if (members.length > 1 && !expanded) {
      stacks.push({ clusterKey, lngLat, hiddenCount: members.length - 1 });
    }
  }

  const ordered = [
    ...pins.filter((pin) => !pin.isSelected),
    ...pins.filter((pin) => pin.isSelected),
  ];
  return { pins: ordered, stacks };
}

/** Zoom from which pins carry the node name next to the avatar. */
export const PIN_LABEL_MIN_ZOOM = 10;

/**
 * Names on every pin clutter a zoomed-out map; show them once zoomed in,
 * and always for the selected node and this device.
 */
export const showPinLabel = (pin: MapPin, zoomedIn: boolean): boolean =>
  pin.isSelected || pin.isSelf || zoomedIn;

/** Whether the zoom is past the label threshold; a boolean so pins only re-render when it flips. */
export const pinLabelsAtZoom = (zoom: number): boolean =>
  zoom >= PIN_LABEL_MIN_ZOOM;

/**
 * Pins are DOM markers, which stay smooth up to a few hundred. Past this
 * count a GeoJSON symbol layer would scale better; meshes that large are
 * rare for a single radio's node DB, so DOM pins are kept for their
 * accessible buttons and avatar styling.
 */
export const DOM_PIN_SOFT_LIMIT = 300;

/** Node at exactly this point, preferring the given candidates' order. */
export const nodeAtLngLat = <T extends PinSource>(
  nodes: readonly T[],
  [lng, lat]: LngLat,
  toleranceDeg = 1e-6,
): T | undefined =>
  nodes.find(
    (node) =>
      node.lngLat !== undefined &&
      Math.abs(node.lngLat[0] - lng) <= toleranceDeg &&
      Math.abs(node.lngLat[1] - lat) <= toleranceDeg,
  );
