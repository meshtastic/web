import type { WaypointWithMetadata } from "@core/stores";
import { toLngLat } from "@core/utils/geo.ts";
import { coordToDeg, hasGeofence } from "@core/utils/geofence.ts";
import { circle } from "@turf/turf";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

export interface GeofenceLayerProps {
  id: string;
  waypoints: readonly WaypointWithMetadata[];
  isVisible: boolean;
}

type FeatureProps = {
  waypointId: number;
  kind: "circle" | "box";
};

export function generateGeofenceFeatures(
  waypoints: readonly WaypointWithMetadata[],
): FeatureCollection<Polygon, FeatureProps> {
  const features: Feature<Polygon, FeatureProps>[] = [];
  for (const wp of waypoints) {
    if (!hasGeofence(wp)) continue;
    if (wp.geofenceRadius > 0) {
      const [lng, lat] = toLngLat({ latitudeI: wp.latitudeI, longitudeI: wp.longitudeI });
      const feat = circle([lng, lat], wp.geofenceRadius, {
        steps: 64,
        units: "meters",
      }) as Feature<Polygon, FeatureProps>;
      feat.properties = { waypointId: wp.id, kind: "circle" };
      features.push(feat);
    }
    if (wp.boundingBox) {
      const west = coordToDeg(wp.boundingBox.longitudeWestI);
      const east = coordToDeg(wp.boundingBox.longitudeEastI);
      const south = coordToDeg(wp.boundingBox.latitudeSouthI);
      const north = coordToDeg(wp.boundingBox.latitudeNorthI);
      features.push({
        type: "Feature",
        properties: { waypointId: wp.id, kind: "box" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

export const GeofenceLayer = ({ id, waypoints, isVisible }: GeofenceLayerProps) => {
  const data = useMemo(() => generateGeofenceFeatures(waypoints), [waypoints]);
  return (
    <Source id={id} type="geojson" data={data}>
      <Layer
        id={`${id}-fill`}
        type="fill"
        layout={{ visibility: isVisible ? "visible" : "none" }}
        paint={{
          "fill-color": "#f59e0b",
          "fill-opacity": 0.15,
        }}
      />
      <Layer
        id={`${id}-line`}
        type="line"
        layout={{ visibility: isVisible ? "visible" : "none" }}
        paint={{
          "line-color": "#f59e0b",
          "line-width": 2,
          "line-dasharray": [2, 2],
        }}
      />
    </Source>
  );
};
