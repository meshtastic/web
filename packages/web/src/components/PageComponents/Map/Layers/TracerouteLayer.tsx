import type { VisibilityState } from "@components/PageComponents/Map/Tools/MapLayerTool";
import { useDevice, useNodeDB } from "@core/stores";
import { hasPos, toLngLat } from "@core/utils/geo";
import { getSignalColor } from "@core/utils/signalColor";
import type { Protobuf, Types } from "@meshtastic/core";
import type { Feature, FeatureCollection } from "geojson";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

export interface TracerouteLayerProps {
  id: string;
  visibilityState: VisibilityState;
}

/**
 * Returns whether every node in the path has a known GPS position.
 * Exported so the Traceroutes page can flag rows that can't be fully drawn.
 */
export function tracerouteHasFullPositions(
  traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>,
  getNode: (nodeNum: number) => Protobuf.Mesh.NodeInfo | undefined,
): boolean {
  const path = [traceroute.to, ...(traceroute.data.route ?? []), traceroute.from];
  return path.every((num) => hasPos(getNode(num)?.position));
}

function buildHopSegments(
  pathNums: (number | undefined)[],
  snrValues: number[],
  direction: "towards" | "back",
  getNode: (nodeNum: number) => Protobuf.Mesh.NodeInfo | undefined,
): Feature[] {
  const features: Feature[] = [];
  const totalHops = pathNums.length - 1;

  for (let i = 0; i < totalHops; i++) {
    const fromNum = pathNums[i];
    const toNum = pathNums[i + 1];
    if (fromNum == null || toNum == null) continue;
    const fromNode = getNode(fromNum);
    const toNode = getNode(toNum);
    if (!fromNode || !toNode || !hasPos(fromNode.position) || !hasPos(toNode.position)) {
      continue;
    }
    const fromPos = toLngLat(fromNode.position);
    const toPos = toLngLat(toNode.position);
    const snr = snrValues[i] ?? null;

    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [fromPos, toPos],
      },
      properties: {
        color: snr !== null ? getSignalColor(snr) : "#888888",
        snr,
        from: fromNode.num,
        to: toNode.num,
        hopIndex: i + 1,
        totalHops,
        direction,
      },
    });
  }
  return features;
}

export const TracerouteLayer = ({ id, visibilityState }: TracerouteLayerProps) => {
  const { traceroutes, pendingTraceroutes, hardware } = useDevice();
  const { getNode } = useNodeDB();

  const featureCollection: FeatureCollection = useMemo(() => {
    if (!visibilityState.traceroutes) {
      return { type: "FeatureCollection", features: [] };
    }

    const features: Feature[] = [];

    // Pending traceroutes: dashed red line from my node to destination
    const myNode = getNode(hardware.myNodeNum);
    if (hasPos(myNode?.position)) {
      for (const [destNum] of pendingTraceroutes) {
        const destNode = getNode(destNum);
        if (hasPos(destNode?.position)) {
          features.push({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [toLngLat(myNode!.position), toLngLat(destNode!.position)],
            },
            properties: {
              color: "#ef4444",
              direction: "pending",
            },
          });
        }
      }
    }

    for (const routeList of traceroutes.values()) {
      const traceroute = routeList[routeList.length - 1];
      if (!traceroute) continue;

      const route = traceroute.data.route ?? [];
      const routeBack = traceroute.data.routeBack ?? [];
      const snrTowards = (traceroute.data.snrTowards ?? []).map((s) => s / 4);
      const snrBack = (traceroute.data.snrBack ?? []).map((s) => s / 4);

      // Forward path: origin → ...intermediate hops → destination
      const forwardPath = [traceroute.to, ...route, traceroute.from];
      const hopSegments = buildHopSegments(forwardPath, snrTowards, "towards", getNode);
      features.push(...hopSegments);

      // Return path (if present): destination → ...intermediate hops → origin
      if (routeBack.length > 0) {
        const backPath = [traceroute.from, ...routeBack, traceroute.to];
        features.push(...buildHopSegments(backPath, snrBack, "back", getNode));
      }

      // Fallback: if the forward path couldn't be fully drawn but both endpoints
      // have positions, draw a direct dashed line so the connection is still visible.
      const allSegmentsDrawn = hopSegments.length === forwardPath.length - 1;
      if (!allSegmentsDrawn) {
        const originNode = getNode(traceroute.to);
        const destNode = getNode(traceroute.from);
        if (hasPos(originNode?.position) && hasPos(destNode?.position)) {
          features.push({
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [toLngLat(originNode!.position), toLngLat(destNode!.position)],
            },
            properties: {
              color: "#facc15",
              snr: null,
              from: traceroute.to,
              to: traceroute.from,
              direction: "fallback",
            },
          });
        }
      }
    }

    return { type: "FeatureCollection", features };
  }, [traceroutes, pendingTraceroutes, hardware.myNodeNum, visibilityState.traceroutes, getNode]);

  if (!visibilityState.traceroutes) {
    return null;
  }

  return (
    <Source type="geojson" data={featureCollection}>
      <Layer
        id={id}
        type="line"
        filter={["==", ["get", "direction"], "towards"]}
        paint={{
          "line-color": ["get", "color"],
          "line-width": 3,
        }}
      />
      <Layer
        id={`${id}-back`}
        type="line"
        filter={["==", ["get", "direction"], "back"]}
        paint={{
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-dasharray": [3, 2],
        }}
      />
      <Layer
        id={`${id}-fallback`}
        type="line"
        filter={["==", ["get", "direction"], "fallback"]}
        paint={{
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-dasharray": [2, 4],
        }}
      />
      <Layer
        id={`${id}-pending`}
        type="line"
        filter={["==", ["get", "direction"], "pending"]}
        paint={{
          "line-color": ["get", "color"],
          "line-width": 2,
          "line-dasharray": [2, 3],
        }}
      />
    </Source>
  );
};
