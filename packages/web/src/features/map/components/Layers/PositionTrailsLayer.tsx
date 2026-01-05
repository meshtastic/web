import { usePositionTrails } from "@data/hooks";
import type { Node, PositionLog } from "@data/schema";
import { useDevice } from "@state/index.ts";
import type { Feature, FeatureCollection } from "geojson";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

const INT_DEG = 1e7;

export interface PositionTrailsLayerProps {
  id: string;
  filteredNodes: Node[];
  isVisible: boolean;
  trailDurationHours?: number;
}

/**
 * Convert position trails to GeoJSON LineStrings
 */
function generateTrailLines(
  trails: Map<number, PositionLog[]>,
): FeatureCollection {
  const features: Feature[] = [];

  for (const [nodeNum, positions] of trails.entries()) {
    // Need at least 2 positions to draw a line
    if (positions.length < 2) {
      continue;
    }

    // Convert to GeoJSON coordinates [lng, lat] - PositionLog has latitudeI/longitudeI
    const coordinates = positions
      .filter(
        (pos): pos is PositionLog & { latitudeI: number; longitudeI: number } =>
          pos.latitudeI !== null && pos.longitudeI !== null,
      )
      .map((pos) => [pos.longitudeI / INT_DEG, pos.latitudeI / INT_DEG]);

    if (coordinates.length < 2) {
      continue;
    }

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
    () => filteredNodes.map((node) => node.nodeNum),
    [filteredNodes],
  );

  // Fetch position trails from database
  const { trails } = usePositionTrails(
    deviceId,
    isVisible ? nodeNums : [],
    sinceTimestamp,
    100,
  );

  // Generate GeoJSON features
  const featureCollection = useMemo(() => {
    if (!isVisible) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    return generateTrailLines(trails);
  }, [trails, isVisible]);

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
