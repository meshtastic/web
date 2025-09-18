import { getColorFromText, isLightColor } from "@app/core/utils/color";
import { precisionBitsToMeters, toLngLat } from "@core/utils/geo.ts";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { circle } from "@turf/turf";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import { Layer, Source } from "react-map-gl/maplibre";

export interface PrecisionLayerProps {
  id: string;
  filteredNodes: Protobuf.Mesh.NodeInfo[];
  isVisible: boolean;
}

type CircleProps = {
  r: number;
  g: number;
  b: number;
  a?: number;
  sortKey: number;
};

export function generatePrecisionCircles(
  filteredNodes: Protobuf.Mesh.NodeInfo[],
): FeatureCollection {
  const unique = new Map<
    string,
    {
      lng: number;
      lat: number;
      radiusM: number;
      r: number;
      g: number;
      b: number;
      a: number;
    }
  >();

  for (const node of filteredNodes) {
    if (
      node.position?.precisionBits === undefined ||
      node.position.precisionBits === 0
    ) {
      continue;
    }
    const [lng, lat] = toLngLat(node.position);
    const radiusM = precisionBitsToMeters(node.position?.precisionBits ?? 0);

    const safeText =
      node.user?.shortName ??
      numberToHexUnpadded(node.num).slice(-4).toUpperCase();
    const color = getColorFromText(safeText);
    const isLight = isLightColor(color);

    const key = `${lat},${lng}:${radiusM}`;

    if (!unique.has(key)) {
      unique.set(key, {
        lng,
        lat,
        radiusM,
        r: color.r,
        g: color.g,
        b: color.b,
        a: isLight ? 0.3 : 0.2, // light colors need more alpha to be as visible
      });
    }
  }

  const items = Array.from(unique.values()).sort(
    (a, b) => a.radiusM - b.radiusM,
  );

  const features: Feature<Polygon, CircleProps>[] = items.map(
    ({ lng, lat, radiusM, r, g, b, a }) => {
      const feat = circle([lng, lat], radiusM, {
        steps: 64,
        units: "meters",
      }) as Feature<Polygon, CircleProps>;
      feat.properties = { r, g, b, a, sortKey: -radiusM };
      return feat;
    },
  );
  return { type: "FeatureCollection", features };
}

export const SourcePrecisionCircles = ({
  data,
  id,
  isVisible,
}: {
  data: FeatureCollection;
  id: string;
  isVisible: boolean;
}) => {
  return (
    <Source id={id} type="geojson" data={data}>
      <Layer
        id={`${id}-fill`}
        type="fill"
        layout={{ visibility: isVisible ? "visible" : "none" }}
        paint={{
          "fill-color": [
            "rgba",
            ["get", "r"],
            ["get", "g"],
            ["get", "b"],
            ["get", "a"],
          ],
        }}
      />
      <Layer
        id={`${id}-line`}
        type="line"
        layout={{ visibility: isVisible ? "visible" : "none" }}
        paint={{
          "line-color": ["rgba", 255, 255, 255, 0.5],
          "line-width": 2,
        }}
      />
    </Source>
  );
};

export const PrecisionLayer = ({
  id,
  filteredNodes,
  isVisible,
}: PrecisionLayerProps): React.ReactNode => {
  return (
    <SourcePrecisionCircles
      data={generatePrecisionCircles(filteredNodes)}
      id={id}
      isVisible={isVisible}
    />
  );
};
