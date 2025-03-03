import { NodeDetail } from "@app/components/PageComponents/Map/NodeDetail";
import { Avatar } from "@app/components/UI/Avatar";
import { useTheme } from "@app/core/hooks/useTheme";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Protobuf } from "@meshtastic/core";
import { bbox, lineString } from "@turf/turf";
import { current } from "immer";
import { MapPinIcon } from "lucide-react";
import { type JSX, useCallback, useEffect, useMemo, useState } from "react";
import {
  AttributionControl,
  GeolocateControl,
  Layer,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  useMap,
} from "react-map-gl/maplibre";
import MapGl from "react-map-gl/maplibre";

// taken from android client these probably should be moved into a shared file
const SNR_GOOD_THRESHOLD = -7;
const SNR_FAIR_THRESHOLD = -15;
const RSSI_GOOD_THRESHOLD = -115;
const RSSI_FAIR_THRESHOLD = -126;
const LINE_GOOD_COLOR = "#00ff00";
const LINE_FAIR_COLOR = "#ffe600";
const LINE_BAD_COLOR = "#f7931a";

const getSignalColor = (snr: number, rssi?: number) => {
  if (snr > SNR_GOOD_THRESHOLD && (rssi == null || rssi > RSSI_GOOD_THRESHOLD))
    return LINE_GOOD_COLOR;
  if (snr > SNR_FAIR_THRESHOLD && (rssi == null || rssi > RSSI_FAIR_THRESHOLD))
    return LINE_FAIR_COLOR;
  return LINE_BAD_COLOR;
};

const DIRECT_NODE_TIMEOUT = 60 * 20; // 60 seconds * ? minutes

type NodePosition = {
  latitude: number;
  longitude: number;
};

const convertToLatLng = (position: {
  latitudeI?: number;
  longitudeI?: number;
}): NodePosition => ({
  latitude: (position.latitudeI ?? 0) / 1e7,
  longitude: (position.longitudeI ?? 0) / 1e7,
});

const generateNeighborLines = (
  nodes: {
    node: Protobuf.Mesh.NodeInfo;
    neighborInfo: Protobuf.Mesh.NeighborInfo;
  }[],
) => {
  const features = [];
  for (const { node, neighborInfo } of nodes) {
    const start = convertToLatLng(node.position);
    if (!neighborInfo) continue;
    for (const neighbor of neighborInfo.neighbors) {
      const toNode = nodes.find((n) => n.node.num === neighbor.nodeId)?.node;
      if (!toNode) continue;
      const end = convertToLatLng(toNode.position);
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [start.longitude, start.latitude],
            [end.longitude, end.latitude],
          ],
        },
        properties: {
          color: getSignalColor(neighbor.snr),
        },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
};
const generateDirectLines = (nodes: Protobuf.Mesh.NodeInfo[]) => {
  const selfNode = nodes.find((n) => n.isFavorite);
  const features: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[][];
    };
    properties: {
      color: string;
    };
  }[] = [];

  if (!selfNode || !selfNode.position)
    return { type: "FeatureCollection", features };

  for (const node of nodes) {
    if (!node.position) continue;
    if (node.hopsAway > 0) continue;
    if (Date.now() / 1000 - node.lastHeard > DIRECT_NODE_TIMEOUT) continue;
    const start = convertToLatLng(node.position);
    const end = convertToLatLng(selfNode.position);
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
      },
      properties: {
        color: getSignalColor(node.snr),
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
};
const MapPage = (): JSX.Element => {
  const { nodes, waypoints, neighborInfo } = useDevice();
  const currentTheme = useTheme();
  const { default: map } = useMap();

  const darkMode = currentTheme === "dark";

  const [selectedNode, setSelectedNode] =
    useState<Protobuf.Mesh.NodeInfo | null>(null);

  // Filter out nodes without a valid position
  const validNodes = useMemo(
    () =>
      Array.from(nodes.values()).filter(
        (node): node is Protobuf.Mesh.NodeInfo =>
          Boolean(node.position?.latitudeI),
      ),
    [nodes],
  );

  const handleMarkerClick = useCallback(
    (node: Protobuf.Mesh.NodeInfo, event: { originalEvent: MouseEvent }) => {
      event?.originalEvent?.stopPropagation();

      setSelectedNode(node);

      if (map) {
        const position = convertToLatLng(node.position);
        map.easeTo({
          center: [position.longitude, position.latitude],
          zoom: map?.getZoom(),
        });
      }
    },
    [map],
  );

  // Get the bounds of the map based on the nodes furtherest away from center
  const getMapBounds = useCallback(() => {
    if (!map) {
      return;
    }

    if (!validNodes.length) {
      return;
    }
    if (validNodes.length === 1) {
      map.easeTo({
        zoom: map.getZoom(),
        center: [
          (validNodes[0].position?.longitudeI ?? 0) / 1e7,
          (validNodes[0].position?.latitudeI ?? 0) / 1e7,
        ],
      });
      return;
    }
    const line = lineString(
      validNodes.map((n) => [
        (n.position?.latitudeI ?? 0) / 1e7,
        (n.position?.longitudeI ?? 0) / 1e7,
      ]),
    );
    const bounds = bbox(line);
    const center = map.cameraForBounds(
      [
        [bounds[1], bounds[0]],
        [bounds[3], bounds[2]],
      ],
      { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
    );
    if (center) {
      map.easeTo(center);
    }
  }, [validNodes, map]);

  // Generate all markers
  const markers = useMemo(
    () =>
      validNodes.map((node) => {
        const position = convertToLatLng(node.position);
        return (
          <Marker
            key={`marker-${node.num}`}
            longitude={position.longitude}
            latitude={position.latitude}
            anchor="bottom"
            onClick={(e) => handleMarkerClick(node, e)}
          >
            <Avatar
              text={node.user?.shortName?.toString() ?? node.num.toString()}
              className="border-[1.5px] border-slate-600 shadow-xl shadow-slate-600"
            />
          </Marker>
        );
      }),
    [validNodes, handleMarkerClick],
  );

  const neighborLines = useMemo(() => {
    return generateNeighborLines(
      validNodes.map((vn) => ({
        node: vn,
        neighborInfo: neighborInfo.get(vn.num),
      })),
    );
  }, [validNodes, neighborInfo]);

  const directLines = useMemo(
    () => generateDirectLines(validNodes),
    [validNodes],
  );
  useEffect(() => {
    map?.on("load", () => {
      getMapBounds();
    });
  }, [map, getMapBounds]);

  return (
    <>
      <Sidebar />
      <PageLayout label="Map" noPadding={true} actions={[]}>
        <MapGl
          mapStyle="https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json"
          attributionControl={false}
          renderWorldCopies={false}
          maxPitch={0}
          antialias={true}
          style={{
            filter: darkMode ? "brightness(0.9)" : "",
          }}
          dragRotate={false}
          touchZoomRotate={false}
          initialViewState={{
            zoom: 1.8,
            latitude: 35,
            longitude: 0,
          }}
        >
          <AttributionControl
            style={{
              background: darkMode ? "#ffffff" : "",
              color: darkMode ? "black" : "",
            }}
          />
          <GeolocateControl
            position="top-right"
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation
          />
          <NavigationControl position="top-right" showCompass={false} />

          <ScaleControl />
          {waypoints.map((wp) => (
            <Marker
              key={wp.id}
              longitude={(wp.longitudeI ?? 0) / 1e7}
              latitude={(wp.latitudeI ?? 0) / 1e7}
              anchor="bottom"
            >
              <div>
                <MapPinIcon size={16} />
              </div>
            </Marker>
          ))}
          {markers}
          <Source id="neighbor-lines" type="geojson" data={neighborLines}>
            <Layer
              id="neighborLineLayer"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": 2,
              }}
            />
          </Source>
          <Source id="direct-lines" type="geojson" data={directLines}>
            <Layer
              id="directLineLayer"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": 4,
              }}
            />
          </Source>
          {selectedNode ? (
            <Popup
              anchor="top"
              longitude={convertToLatLng(selectedNode.position).longitude}
              latitude={convertToLatLng(selectedNode.position).latitude}
              onClose={() => setSelectedNode(null)}
            >
              <NodeDetail node={selectedNode} />
            </Popup>
          ) : null}
        </MapGl>
      </PageLayout>
    </>
  );
};

export default MapPage;
