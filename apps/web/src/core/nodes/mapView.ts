import type { Bounds, LngLat } from "@core/utils/geo.ts";
import { z } from "zod/v4";

/** Where the map opens, and what it remembers between visits. */

export interface MapView {
  readonly longitude: number;
  readonly latitude: number;
  readonly zoom: number;
}

/**
 * Versioned so a view saved by older builds (which stored every camera move,
 * including automatic fits) is not restored over a fresh fit.
 */
export const MAP_VIEW_STORAGE_KEY = "meshtastic:mapView:v2";

/**
 * react-map-gl reports a failed `import("maplibre-gl")` (a stale chunk
 * after a deploy, a 504, being offline) through `onError` before any map
 * exists, so the event has no target. Tile and style errors come from a
 * live map and carry it; those are not fatal.
 */
export const isMapLoadFailure = (event: {
  readonly target?: unknown;
}): boolean => event.target === null || event.target === undefined;

/** Zoom used when jumping to one node ("Show on map"). */
export const NODE_FOCUS_ZOOM = 14;

const mapViewSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  zoom: z.number().min(0).max(24),
});

/** Parses a stored view; anything malformed or out of range is ignored. */
export const parseMapView = (raw: string | null): MapView | undefined => {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = mapViewSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

export const serializeMapView = (view: MapView): string =>
  JSON.stringify({
    longitude: view.longitude,
    latitude: view.latitude,
    zoom: view.zoom,
  });

// Route params may arrive parsed (numbers) or raw (strings); accept both.
const routeViewSchema = z.object({
  long: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  zoom: z.coerce.number().min(0).max(24),
});

/** The `/map/$long/$lat/$zoom` params as a view, when all three are present. */
export const viewFromRouteParams = (params: unknown): MapView | undefined => {
  const parsed = routeViewSchema.safeParse(params);
  return parsed.success
    ? {
        longitude: parsed.data.long,
        latitude: parsed.data.lat,
        zoom: parsed.data.zoom,
      }
    : undefined;
};

export type InitialView =
  | { readonly kind: "route"; readonly view: MapView }
  | { readonly kind: "saved"; readonly view: MapView }
  /** No view to restore: fit the map to the nodes once they load. */
  | { readonly kind: "fitNodes" };

/** A link to a place wins over the remembered view, which wins over fitting. */
export const pickInitialView = (
  route: MapView | undefined,
  saved: MapView | undefined,
): InitialView =>
  route
    ? { kind: "route", view: route }
    : saved
      ? { kind: "saved", view: saved }
      : { kind: "fitNodes" };

/**
 * Fitting the camera to the nodes. It fits once when nodes first appear and,
 * if that first fit only had one node, once more when a second one arrives,
 * so a lone early node doesn't pin the view. Any user move stops fitting.
 */
export type FitPhase =
  /** Waiting for the first node. */
  | "pending"
  /** Fitted to a single node; refit once when there are more. */
  | "fittedOne"
  /** Fitted to several nodes, or the user has taken over. */
  | "done";

export interface FitStep {
  readonly fit: boolean;
  readonly phase: FitPhase;
}

/** What to do now that `nodeCount` nodes are placed. */
export const nextFitStep = (phase: FitPhase, nodeCount: number): FitStep => {
  if (phase === "pending" && nodeCount > 0) {
    return { fit: true, phase: nodeCount > 1 ? "done" : "fittedOne" };
  }
  if (phase === "fittedOne" && nodeCount > 1) {
    return { fit: true, phase: "done" };
  }
  return { fit: false, phase };
};

/** The view to start from decides whether fitting happens at all. */
export const initialFitPhase = (initial: InitialView): FitPhase =>
  initial.kind === "fitNodes" ? "pending" : "done";

/**
 * Only views the user chose are remembered: camera moves made by the app
 * (fits, link targets, resizes) carry no originating input event, and nothing
 * is saved until the map has loaded with its initial view in place.
 */
export const shouldPersistMove = (move: {
  readonly userInitiated: boolean;
  readonly initialViewApplied: boolean;
}): boolean => move.userInitiated && move.initialViewApplied;

export interface FitPadding {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/** The smallest span (px) left for the nodes after padding. */
export const MIN_FIT_SPAN = 64;

const scalePair = (a: number, b: number, size: number): [number, number] => {
  const available = Math.max(0, size - MIN_FIT_SPAN);
  const total = a + b;
  if (total <= available) {
    return [a, b];
  }
  const factor = total > 0 ? available / total : 0;
  return [Math.floor(a * factor), Math.floor(b * factor)];
};

/**
 * Shrinks padding that would leave no room for the nodes, keeping each side's
 * share. maplibre's cameraForBounds gives up when padding exceeds the map.
 */
export const clampFitPadding = (
  padding: FitPadding,
  container: { readonly width: number; readonly height: number },
): FitPadding => {
  const [left, right] = scalePair(padding.left, padding.right, container.width);
  const [top, bottom] = scalePair(
    padding.top,
    padding.bottom,
    container.height,
  );
  return { top, bottom, left, right };
};

/**
 * Desktop overlay geometry (px), shared by the Map screen's panels and the
 * padding used when fitting nodes, so fitted pins land clear of the panels.
 */
export const MAP_OVERLAY_INSET = 16;
export const MAP_NODE_PANEL_WIDTH = 300;
export const MAP_LAYERS_PANEL_WIDTH = 200;

/**
 * Room for a pin's own body: padding places pin centres, and a pin is about
 * 40px across, so without this an edge pin half-hides under a panel.
 */
export const MAP_PIN_CLEARANCE = 20;

export const DESKTOP_FIT_PADDING = {
  top: MAP_OVERLAY_INSET * 2 + MAP_PIN_CLEARANCE,
  bottom: MAP_OVERLAY_INSET * 2 + MAP_PIN_CLEARANCE,
  // 16 + 300 + 16 + 20 = 352
  left: MAP_OVERLAY_INSET * 2 + MAP_NODE_PANEL_WIDTH + MAP_PIN_CLEARANCE,
  // 16 + 200 + 16 + 20 = 252
  right: MAP_OVERLAY_INSET * 2 + MAP_LAYERS_PANEL_WIDTH + MAP_PIN_CLEARANCE,
} as const;

/**
 * How far (px) the desktop panels reach into the map from each side: the
 * node list's right edge from the map's left, and the layers card's left
 * edge from the map's right. Measured from the rendered panels.
 */
export interface OverlayReach {
  readonly left: number;
  readonly right: number;
}

/**
 * Fit padding that clears the measured panels by one inset plus a pin's
 * half-width. Falls back to
 * the constants' geometry when nothing was measured (or a panel had no
 * size yet, e.g. before layout).
 */
export const desktopFitPadding = (reach?: OverlayReach): FitPadding => {
  if (!reach) {
    return DESKTOP_FIT_PADDING;
  }
  const side = (measured: number, fallback: number) =>
    Number.isFinite(measured) && measured > 0
      ? Math.ceil(measured) + MAP_OVERLAY_INSET + MAP_PIN_CLEARANCE
      : fallback;
  return {
    top: DESKTOP_FIT_PADDING.top,
    bottom: DESKTOP_FIT_PADDING.bottom,
    left: side(reach.left, DESKTOP_FIT_PADDING.left),
    right: side(reach.right, DESKTOP_FIT_PADDING.right),
  };
};

/** What the initial fit frames: one spot, or a box around several. */
export type FitTarget =
  | { readonly kind: "point"; readonly center: LngLat }
  | { readonly kind: "bounds"; readonly bounds: Bounds };

/** A node this many times further out than the median node is an outlier. */
export const FIT_OUTLIER_FACTOR = 10;
/**
 * Nodes within this distance (m) of the anchor are never outliers: about
 * the reach of a regional LoRa mesh. Without it, a dense core (or many
 * nodes sharing one spot, median ~0) would cut off the rest of the mesh.
 */
export const FIT_OUTLIER_FLOOR_M = 200_000;

const EARTH_MEAN_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle (haversine) distance in metres. */
export const greatCircleMeters = (
  [lng1, lat1]: LngLat,
  [lng2, lat2]: LngLat,
): number => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const hi = sorted[mid] ?? 0;
  const lo = sorted[mid - 1] ?? hi;
  return sorted.length % 2 === 0 ? (lo + hi) / 2 : hi;
};

const boundsOf = (points: readonly LngLat[]): Bounds => {
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
};

/**
 * What the initial fit should frame, ignoring far-flung outliers (e.g. an
 * MQTT node on another continent) so they don't zoom the map out to the
 * whole world. Outliers stay on the map; they are only left out of the fit.
 *
 * Rule:
 * 1. Anchor on the connected radio's own position when it has one, else on
 *    the component-wise median longitude/latitude of the points.
 * 2. Take each point's great-circle distance to the anchor, and the median
 *    of those distances. The radio's own zero counts: with only a few
 *    nodes, leaving it out lets a single outlier drag the median out.
 * 3. Keep points within max(FIT_OUTLIER_FACTOR × median, FIT_OUTLIER_FLOOR_M)
 *    of the anchor.
 * 4. Never frame fewer than two points when there were two: if the fence
 *    leaves fewer, keep the two nearest the anchor.
 *
 * One point (or several on one spot) is a `point`, framed at the
 * single-node zoom; anything else is `bounds`.
 */
export const fitBoundsFor = (
  points: readonly LngLat[],
  ownPosition?: LngLat,
): FitTarget | undefined => {
  if (points.length === 0) {
    return undefined;
  }
  const anchor: LngLat = ownPosition ?? [
    median(points.map(([lng]) => lng)),
    median(points.map(([, lat]) => lat)),
  ];
  const measured = points
    .map((point) => ({ point, meters: greatCircleMeters(anchor, point) }))
    .sort((a, b) => a.meters - b.meters);
  const fence = Math.max(
    FIT_OUTLIER_FACTOR * median(measured.map((m) => m.meters)),
    FIT_OUTLIER_FLOOR_M,
  );
  const inside = measured.filter((m) => m.meters <= fence);
  const kept = (
    inside.length >= Math.min(2, measured.length)
      ? inside
      : measured.slice(0, 2)
  ).map((m) => m.point);

  const bounds = boundsOf(kept);
  const [[west, south], [east, north]] = bounds;
  if (west === east && south === north) {
    return { kind: "point", center: [west, south] };
  }
  return { kind: "bounds", bounds };
};

export const MOBILE_FIT_PADDING = {
  top: 72,
  bottom: 24,
  left: 24,
  right: 72,
} as const;
