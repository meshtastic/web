import { boundsFromLngLat, type LngLat, toLngLat } from "@core/utils/geo";
import type { Protobuf } from "@core/protobuf.ts";
import { useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export interface MapFitPadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const DEFAULT_PADDING: MapFitPadding = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

/**
 * `padding` keeps fitted nodes clear of anything floating over the map,
 * such as the Map screen's node list and layers panels.
 */
export function useMapFitting(
  map: MapRef | undefined,
  padding: MapFitPadding = DEFAULT_PADDING,
) {
  const focusLngLat = useCallback(
    (position: LngLat) => {
      if (!map) {
        return;
      }
      const [lng, lat] = position;
      map.easeTo({
        center: [lng, lat],
        zoom: map.getZoom(),
      });
    },
    [map],
  );

  const fitToNodes = useCallback(
    (nodes: Protobuf.Mesh.NodeInfo[]) => {
      if (!map || nodes.length === 0) {
        return;
      }

      if (nodes.length === 1 && nodes[0]) {
        return focusLngLat(toLngLat(nodes[0].position));
      }

      // Build [lng, lat] coords, then let boundsFromLngLat do the turf dance
      const coords = nodes.map((n) => toLngLat(n.position));
      const bounds = boundsFromLngLat(coords);
      if (!bounds) {
        return;
      }

      const center = map.cameraForBounds(bounds, {
        padding,
      });

      if (center) {
        map.easeTo(center);
      }
    },
    [map, focusLngLat, padding],
  );

  return { focusLngLat, fitToNodes };
}
