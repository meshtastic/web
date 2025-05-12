import { NodeDetail } from "../../components/PageComponents/Map/NodeDetail.tsx";
import { Avatar } from "../../components/UI/Avatar.tsx";
import { useTheme } from "../../core/hooks/useTheme.ts";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Protobuf } from "@meshtastic/core";
import { bbox, lineString } from "@turf/turf";
import { MapPinIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useNodeFilters } from "@core/hooks/useNodeFilters.ts";
import { FilterControl } from "@pages/Map/FilterControl.tsx";
import { cn } from "@core/utils/cn.ts";

// taken from android client these probably should be moved into a shared file
const SNR_GOOD_THRESHOLD = -7;
const SNR_FAIR_THRESHOLD = -15;
const RSSI_GOOD_THRESHOLD = -115;
const RSSI_FAIR_THRESHOLD = -126;
const LINE_GOOD_COLOR = "#00ff00";
const LINE_FAIR_COLOR = "#ffe600";
const LINE_BAD_COLOR = "#f7931a";

const getSignalColor = (snr: number, rssi?: number) => {
  if (
    snr > SNR_GOOD_THRESHOLD && (rssi == null || rssi > RSSI_GOOD_THRESHOLD)
  ) {
    return LINE_GOOD_COLOR;
  }
  if (
    snr > SNR_FAIR_THRESHOLD && (rssi == null || rssi > RSSI_FAIR_THRESHOLD)
  ) {
    return LINE_FAIR_COLOR;
  }
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
    if (!node.position) continue;
    const start = convertToLatLng(node.position);
    if (!neighborInfo) continue;
    for (const neighbor of neighborInfo.neighbors) {
      const toNode = nodes.find((n) => n.node.num === neighbor.nodeId)?.node;
      if (!toNode || !toNode.position) continue;
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
const generateDirectLines = (
  myNode: Protobuf.Mesh.NodeInfo,
  nodes: Protobuf.Mesh.NodeInfo[],
) => {
  // const selfNode = nodes.find((n) => n.isFavorite);
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

  if (!myNode || !myNode.position) {
    return { type: "FeatureCollection", features };
  }

  for (const node of nodes) {
    if (!node.position || node.hopsAway !== 0) continue;
    if (Date.now() / 1000 - node.lastHeard > DIRECT_NODE_TIMEOUT) continue;
    const start = convertToLatLng(node.position);
    const end = convertToLatLng(myNode.position);
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
const MapPage = () => {
  const { getNodes, getMyNode, waypoints, neighborInfo } = useDevice();
  const { theme } = useTheme();
  const { default: map } = useMap();

  const darkMode = theme === "dark";

  const [selectedNode, setSelectedNode] = useState<
    Protobuf.Mesh.NodeInfo | null
  >(null);

  const [showSNRLines, setShowSNRLines] = useState(true);

  const toggleSNRLines = () => {
    setShowSNRLines((prev) => !prev);
  };

  // Filter out nodes without a valid position
  const validNodes = useMemo(
    () =>
      getNodes(
        (node): node is Protobuf.Mesh.NodeInfo =>
          Boolean(node.position?.latitudeI),
      ),
    [getNodes],
  );
  const myNode = useMemo(() => getMyNode(), [getMyNode]);
  const {
    filters,
    defaultState,
    onFilterChange,
    resetFilters,
    filteredNodes,
    groupedFilterConfigs,
  } = useNodeFilters(validNodes);

  const isDirty = useMemo(() => {
    return Object.keys(filters).some((key) => {
      const a = filters[key];
      const b = defaultState[key];
      // simple deep‐equal for primitives and [number,number]
      return Array.isArray(a) && Array.isArray(b)
        ? a[0] !== b[0] || a[1] !== b[1]
        : a !== b;
    });
  }, [filters, defaultState]);

  const handleMarkerClick = useCallback(
    (node: Protobuf.Mesh.NodeInfo, event: { originalEvent: MouseEvent }) => {
      event?.originalEvent?.stopPropagation();

      setSelectedNode(node);

      if (map) {
        if (!node.position) return;
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
  }, [filteredNodes, map]);

  // Generate all markers
  const markers = useMemo(
    () =>
      filteredNodes.map((node) => {
        if (!node.position) return null;
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
    [filteredNodes, handleMarkerClick],
  );

  const neighborLines = useMemo(() => {
    if (!showSNRLines) return { type: "FeatureCollection", features: [] };
    return generateNeighborLines(
      filteredNodes
        .map((vn) => ({
          node: vn,
          neighborInfo: neighborInfo.get(vn.num),
        }))
        .filter((
          item,
        ): item is {
          node: Protobuf.Mesh.NodeInfo;
          neighborInfo: Protobuf.Mesh.NeighborInfo;
        } => item.neighborInfo !== undefined),
    );
  }, [filteredNodes, neighborInfo, showSNRLines]);

  const directLines = useMemo(
    () => {
      if (!showSNRLines) return { type: "FeatureCollection", features: [] };
      return generateDirectLines(myNode, filteredNodes);
    },
    [myNode, filteredNodes, showSNRLines],
  );
  useEffect(() => {
    map?.on("load", () => {
      getMapBounds();
    });
  }, [map, getMapBounds]);

  return (
    <>
      <PageLayout label="Map" noPadding actions={[]} leftBar={<Sidebar />}>
        <MapGl
          mapStyle="https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json"
          attributionControl={false}
          renderWorldCopies={false}
          maxPitch={0}
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
          {selectedNode
            ? (
              <Popup
                anchor="top"
                longitude={convertToLatLng(selectedNode.position).longitude}
                latitude={convertToLatLng(selectedNode.position).latitude}
                onClose={() => setSelectedNode(null)}
                className="w-full"
              >
                <NodeDetail node={selectedNode} />
              </Popup>
            )
            : null}
        </MapGl>
        <button
          type="button"
          className={cn(
            "fixed bottom-17 right-16 px-1 py-1 rounded shadow-md",
            isDirty
              ? " text-slate-100  bg-green-600 hover:bg-green-700 hover:text-slate-200 active:bg-green-800"
              : "text-slate-600  bg-slate-100 hover:bg-slate-200 hover:text-slate-700 active:bg-slate-300",
          )}
          onClick={toggleSNRLines}
          aria-label="SNR Lines"
        >
          SNR Lines
        </button>
        <FilterControl
          groupedFilterConfigs={groupedFilterConfigs}
          values={filters}
          onChange={onFilterChange}
          resetFilters={resetFilters}
          isDirty={isDirty}
        />
      </PageLayout>
    </>
  );
};

export default MapPage;
