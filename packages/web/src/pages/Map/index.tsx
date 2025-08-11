import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { BaseMap } from "@components/Map.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useDevice } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import type { Protobuf } from "@meshtastic/core";
import { bbox, lineString } from "@turf/turf";
import { FunnelIcon, MapPinIcon } from "lucide-react";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Marker, Popup, useMap } from "react-map-gl/maplibre";
import { NodeDetail } from "../../components/PageComponents/Map/NodeDetail.tsx";
import { Avatar } from "../../components/UI/Avatar.tsx";

type NodePosition = {
  latitude: number;
  longitude: number;
};

const convertToLatLng = (position?: {
  latitudeI?: number;
  longitudeI?: number;
}): NodePosition => ({
  latitude: (position?.latitudeI ?? 0) / 1e7,
  longitude: (position?.longitudeI ?? 0) / 1e7,
});

const MapPage = () => {
  const { getNodes, waypoints, hasNodeError } = useDevice();
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();

  const { default: map } = useMap();

  const [selectedNode, setSelectedNode] =
    useState<Protobuf.Mesh.NodeInfo | null>(null);

  const validNodes = useMemo(
    () =>
      getNodes((node): node is Protobuf.Mesh.NodeInfo =>
        Boolean(node.position?.latitudeI),
      ),
    [getNodes],
  );

  const [filterState, setFilterState] = useState<FilterState>(
    () => defaultFilterValues,
  );
  const deferredFilterState = useDeferredValue(filterState);

  const filteredNodes = useMemo(
    () => validNodes.filter((node) => nodeFilter(node, deferredFilterState)),
    [validNodes, deferredFilterState, nodeFilter],
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
    if (!map || validNodes.length === 0) {
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
  }, [map, validNodes]);

  // Generate all markers
  const markers = useMemo(
    () =>
      filteredNodes.map((node) => {
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
              className="border-[1.5px] border-slate-600 shadow-m shadow-slate-600"
              showError={hasNodeError(node.num)}
              showFavorite={node.isFavorite}
            />
          </Marker>
        );
      }),
    [filteredNodes, handleMarkerClick, hasNodeError],
  );

  return (
    <PageLayout label="Map" noPadding actions={[]} leftBar={<Sidebar />}>
      <BaseMap onLoad={getMapBounds}>
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
        {selectedNode &&
          (() => {
            const position = convertToLatLng(selectedNode.position);
            return (
              <Popup
                key={selectedNode.num}
                anchor="top"
                longitude={position.longitude}
                latitude={position.latitude}
                onClose={() => setSelectedNode(null)}
                className="w-full"
              >
                <NodeDetail node={selectedNode} />
              </Popup>
            );
          })()}
      </BaseMap>

      <FilterControl
        filterState={filterState}
        defaultFilterValues={defaultFilterValues}
        setFilterState={setFilterState}
        isDirty={isFilterDirty(filterState)}
        parameters={{
          popoverContentProps: {
            side: "bottom",
            align: "end",
            sideOffset: 12,
          },
          popoverTriggerClassName: cn(
            "fixed top-45.5 right-2.5 w-[29px] px-1 py-1 rounded shadow-l outline-[2px] outline-stone-600/20 ",
            "dark:text-slate-600 dark:hover:text-slate-700 bg-stone-50 hover:bg-stone-200 dark:bg-stone-50 dark:hover:bg-stone-200 dark:active:bg-stone-300",
            isFilterDirty(filterState)
              ? "text-slate-100 dark:text-slate-100 bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-700 hover:text-slate-200 dark:hover:text-slate-200 active:bg-green-800 dark:active:bg-green-800 outline-green-600 dark:outline-green-700"
              : "",
          ),
          triggerIcon: <FunnelIcon className="w-5" />,
          showTextSearch: true,
        }}
      />
    </PageLayout>
  );
};

export default MapPage;
