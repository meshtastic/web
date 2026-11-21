import { z } from "zod/v4";

/** Where the map opens, and what it remembers between visits. */

export interface MapView {
  readonly longitude: number;
  readonly latitude: number;
  readonly zoom: number;
}

export const MAP_VIEW_STORAGE_KEY = "meshtastic:mapView";

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
 * Desktop overlay geometry (px), shared by the Map screen's panels and the
 * padding used when fitting nodes, so fitted pins land clear of the panels.
 */
export const MAP_OVERLAY_INSET = 16;
export const MAP_NODE_PANEL_WIDTH = 300;
export const MAP_LAYERS_PANEL_WIDTH = 200;

export const DESKTOP_FIT_PADDING = {
  top: MAP_OVERLAY_INSET * 2,
  bottom: MAP_OVERLAY_INSET * 2,
  // 16 + 300 + 16 = 332
  left: MAP_OVERLAY_INSET * 2 + MAP_NODE_PANEL_WIDTH,
  // 16 + 200 + 16 = 232
  right: MAP_OVERLAY_INSET * 2 + MAP_LAYERS_PANEL_WIDTH,
} as const;

export const MOBILE_FIT_PADDING = {
  top: 72,
  bottom: 24,
  left: 24,
  right: 72,
} as const;
