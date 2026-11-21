import {
  clampFitPadding,
  type FitPadding,
  NODE_FOCUS_ZOOM,
} from "@core/nodes/mapView.ts";
import type { Protobuf } from "@core/protobuf.ts";
import { boundsFromLngLat, type LngLat, toLngLat } from "@core/utils/geo";
import { useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";

const DEFAULT_PADDING: FitPadding = {
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
  padding: FitPadding = DEFAULT_PADDING,
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

      const [only] = nodes;
      if (nodes.length === 1 && only) {
        const [lng, lat] = toLngLat(only.position);
        map.easeTo({ center: [lng, lat], zoom: NODE_FOCUS_ZOOM });
        return;
      }

      // Build [lng, lat] coords, then let boundsFromLngLat do the turf dance
      const coords = nodes.map((n) => toLngLat(n.position));
      const bounds = boundsFromLngLat(coords);
      if (!bounds) {
        return;
      }

      const container = map.getContainer();
      const center = map.cameraForBounds(bounds, {
        padding: clampFitPadding(padding, {
          width: container.clientWidth,
          height: container.clientHeight,
        }),
        maxZoom: NODE_FOCUS_ZOOM,
      });

      if (center) {
        map.easeTo(center);
      }
    },
    [map, padding],
  );

  return { focusLngLat, fitToNodes };
}
