import {
  clampFitPadding,
  type FitPadding,
  fitBoundsFor,
  NODE_FOCUS_ZOOM,
} from "@core/nodes/mapView.ts";
import type { Protobuf } from "@core/protobuf.ts";
import { hasPos, type LngLat, toLngLat } from "@core/utils/geo";
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

  /**
   * Frames the main cluster of `nodes`, anchored on `ownPosition` when the
   * connected radio has one; far-flung outliers stay on the map but are
   * left out of the fit (see `fitBoundsFor`).
   */
  const fitToNodes = useCallback(
    (
      nodes: readonly Protobuf.Mesh.NodeInfo[],
      ownPosition?: Protobuf.Mesh.Position,
    ) => {
      if (!map) {
        return;
      }
      const target = fitBoundsFor(
        nodes.map((node) => toLngLat(node.position)),
        hasPos(ownPosition) ? toLngLat(ownPosition) : undefined,
      );
      if (!target) {
        return;
      }
      if (target.kind === "point") {
        const [lng, lat] = target.center;
        map.easeTo({ center: [lng, lat], zoom: NODE_FOCUS_ZOOM });
        return;
      }

      const container = map.getContainer();
      const center = map.cameraForBounds(target.bounds, {
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
