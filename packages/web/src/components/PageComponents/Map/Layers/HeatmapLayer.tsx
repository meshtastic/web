import { hasPos, toLngLat } from "@core/utils/geo";
import type { Protobuf } from "@meshtastic/core";
import type { Feature, FeatureCollection } from "geojson";
import type { HeatmapLayerSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

export type HeatmapMode = "density" | "snr";

export interface HeatmapLayerProps {
  id: string;
  filteredNodes: Protobuf.Mesh.NodeInfo[];
  mode: HeatmapMode;
}

export const HeatmapLayer = ({
  id,
  filteredNodes,
  mode,
}: HeatmapLayerProps) => {
  const data: FeatureCollection = useMemo(() => {
    const features: Feature[] = filteredNodes
      .filter((node) => hasPos(node.position))
      .filter((node) => mode !== "snr" || node.snr !== undefined)
      .map((node) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: toLngLat(node.position),
        },
        properties: {
          snr: node.snr,
          name: node.user?.longName,
          shortName: node.user?.shortName,
          num: node.num,
        },
      }));

    return {
      type: "FeatureCollection",
      features,
    };
  }, [filteredNodes, mode]);

  const paintProps: HeatmapLayerSpecification["paint"] = useMemo(
    () => ({
      "heatmap-weight":
        mode === "density"
          ? 1
          : ["interpolate", ["linear"], ["get", "snr"], -20, 0, 10, 1],
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
      // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
      // Begin color ramp at 0-stop with a 0-transparancy color
      // to create a blur-like effect.
      "heatmap-color": [
        "interpolate",
        ["linear"],
        ["heatmap-density"],
        0,
        "rgba(33,102,172,0)",
        0.2,
        "rgb(103,169,207)",
        0.4,
        "rgb(209,229,240)",
        0.6,
        "rgb(253,219,199)",
        0.8,
        "rgb(239,138,98)",
        1,
        "rgb(178,24,43)",
      ],
      "heatmap-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        2,
        9,
        20,
        15,
        30,
      ],
      // Opacity 0.7 to be visible but not blocking
      "heatmap-opacity": 0.7,
    }),
    [mode],
  );

  return (
    <Source type="geojson" data={data}>
      <Layer id={id} type="heatmap" paint={paintProps} />
      <Layer
        id={`${id}-interaction`}
        type="circle"
        paint={{
          "circle-radius": 15,
          "circle-opacity": 0,
          "circle-stroke-opacity": 0,
        }}
      />
    </Source>
  );
};
