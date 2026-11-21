/** Which overlays the map draws, and how toggling them interacts. */

export const MAP_LAYER_KEYS = [
  "nodeMarkers",
  "directNeighbors",
  "remoteNeighbors",
  "waypoints",
  "positionPrecision",
  "heatmap",
] as const;

export type MapLayerKey = (typeof MAP_LAYER_KEYS)[number];

export type VisibilityState = Record<MapLayerKey, boolean>;

export const defaultVisibilityState: VisibilityState = {
  nodeMarkers: true,
  directNeighbors: false,
  remoteNeighbors: false,
  waypoints: true,
  positionPrecision: false,
  heatmap: false,
};

/**
 * Flips one layer. Turning the heatmap on hides everything else so the
 * heatmap can be read; the other layers can be turned back on afterwards.
 */
export const toggleLayer = (
  state: VisibilityState,
  key: MapLayerKey,
): VisibilityState => {
  if (key === "heatmap" && !state.heatmap) {
    return {
      nodeMarkers: false,
      directNeighbors: false,
      remoteNeighbors: false,
      waypoints: false,
      positionPrecision: false,
      heatmap: true,
    };
  }
  return { ...state, [key]: !state[key] };
};

export const countVisibleLayers = (state: VisibilityState): number =>
  MAP_LAYER_KEYS.filter((key) => state[key]).length;
