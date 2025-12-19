import { useDevice } from "@core/stores";
import { usePositionTrails } from "@db/hooks";
import type { Protobuf } from "@meshtastic/core";
import type { Feature, FeatureCollection } from "geojson";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

export interface PositionTrailsLayerProps {
  id: string;
  filteredNodes: Protobuf.Mesh.NodeInfo[];
  isVisible: boolean;
  trailDurationHours?: number;
}

/**
 * Convert position trails to GeoJSON LineStrings
 */
function generateTrailLines(
  trails: Map<
    number,
    Array<{ latitudeI: number; longitudeI: number; time: number }>
  >,
): FeatureCollection {
  const features: Feature[] = [];

  for (const [nodeNum, positions] of trails.entries()) {
    // Need at least 2 positions to draw a line
    if (positions.length < 2) {
      continue;
    }

    // Convert to GeoJSON coordinates [lng, lat]
    const coordinates = positions.map((pos) => [
      pos.longitudeI / 1e7,
      pos.latitudeI / 1e7,
    ]);

    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates,
      },
      properties: {
        nodeNum,
        // Color could be customized per node
        color: "#3b82f6",
      },
    });
  }

  return { type: "FeatureCollection", features };
}

export const PositionTrailsLayer = ({
  id,
  filteredNodes,
  isVisible,
  trailDurationHours = 24,
}: PositionTrailsLayerProps): React.ReactNode => {
  const device = useDevice();
  const deviceId = device.id;

  // Calculate time cutoff
  const sinceTimestamp = useMemo(() => {
    const now = Date.now();
    const cutoff = now - trailDurationHours * 60 * 60 * 1000;
    return Math.floor(cutoff / 1000); // Convert to seconds
  }, [trailDurationHours]);

  // Get node numbers for filtered nodes
  const nodeNums = useMemo(
    () => filteredNodes.map((node) => node.num),
    [filteredNodes],
  );

  // Fetch position trails from database
  const { trails, loading } = usePositionTrails(
    deviceId,
    isVisible ? nodeNums : [],
    sinceTimestamp,
    100,
  );

  // Generate GeoJSON features
  const featureCollection = useMemo(() => {
    if (!isVisible || loading) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    return generateTrailLines(trails);
  }, [trails, loading, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <Source type="geojson" data={featureCollection}>
      <Layer
        id={id}
        type="line"
        paint={{
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-opacity": 0.6,
        }}
      />
    </Source>
  );
};
