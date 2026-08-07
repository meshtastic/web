import { boundsFromLngLat, type LngLat, toLngLat } from "@core/utils/geo";
import type { Protobuf } from "@meshtastic/sdk";
import { useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export function useMapFitting(map: MapRef | undefined) {
  const focusLngLat = useCallback(
    (position: LngLat) => {
      if (!map || !position) {
        return;
      }
      const [lng, lat] = position;
      if (
        !Number.isFinite(lng) ||
        !Number.isFinite(lat) ||
        (lng === 0 && lat === 0)
      ) {
        return;
      }
      try {
        map.easeTo({
          center: [lng, lat],
          zoom: map.getZoom(),
        });
      } catch {
        // Ignore easeTo error
      }
    },
    [map],
  );

  const fitToNodes = useCallback(
    (nodes: Protobuf.Mesh.NodeInfo[]) => {
      if (!map || nodes.length === 0) {
        return;
      }

      if (nodes.length === 1 && nodes[0]) {
        const pos = toLngLat(nodes[0].position);
        if (
          pos &&
          Number.isFinite(pos[0]) &&
          Number.isFinite(pos[1]) &&
          !(pos[0] === 0 && pos[1] === 0)
        ) {
          return focusLngLat(pos);
        }
        return;
      }

      const coords = nodes.map((n) => toLngLat(n.position));
      const bounds = boundsFromLngLat(coords);
      if (!bounds) {
        return;
      }

      try {
        const center = map.cameraForBounds(bounds, {
          padding: { top: 10, bottom: 10, left: 10, right: 10 },
        });

        if (center && center.center) {
          map.easeTo(center);
        }
      } catch {
        // Ignore cameraForBounds failure and leave default view
      }
    },
    [map, focusLngLat],
  );

  return { focusLngLat, fitToNodes };
}
