import { create } from "@bufbuild/protobuf";
import { useNodes } from "@data/hooks";
import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { FilterControl } from "@shared/components/generic/Filter/FilterControl";
import {
  type FilterState,
  useFilterNode,
} from "@shared/components/generic/Filter/useFilterNode";
import { useMapFitting } from "@shared/hooks/useMapFitting";
import { cn } from "@shared/utils/cn";
import { hasPos, toLngLat } from "@shared/utils/geo.ts";
import { useDevice, useDeviceContext } from "@state/index.ts";
import { toByteArray } from "base64-js";
import { FunnelIcon, LocateFixedIcon } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import { NodesLayer } from "../components/Layers/NodesLayer.tsx";
import { PositionTrailsLayer } from "../components/Layers/PositionTrailsLayer.tsx";
import { PrecisionLayer } from "../components/Layers/PrecisionLayer.tsx";
import {
  SNRLayer,
  SNRTooltip,
  type SNRTooltipProps,
} from "../components/Layers/SNRLayer.tsx";
import { WaypointLayer } from "../components/Layers/WaypointLayer.tsx";
import { BaseMap } from "../components/Map.tsx";
import type { PopupState } from "../components/Popups/PopupWrapper.tsx";
import {
  defaultVisibilityState,
  MapLayerTool,
  type VisibilityState,
} from "../components/Tools/MapLayerTool.tsx";

// Helper to convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  return matches
    ? new Uint8Array(matches.map((byte) => parseInt(byte, 16)))
    : new Uint8Array();
}

const MapPage = () => {
  const { t } = useTranslation("map");
  const { deviceId } = useDeviceContext();
  const device = useDevice();
  const { nodes: allNodes } = useNodes(deviceId);

  // Filter to only nodes with positions and convert to protobuf format
  const validNodes = useMemo(() => {
    return allNodes
      .filter((node) => Boolean(node.latitudeI))
      .map((node): Protobuf.Mesh.NodeInfo => {
        return {
          $typeName: "meshtastic.NodeInfo",
          num: node.nodeNum,
          snr: node.snr ?? 0,
          lastHeard: node.lastHeard
            ? Math.floor(node.lastHeard.getTime() / 1000)
            : 0,
          channel: 0,
          viaMqtt: false,
          isFavorite: node.isFavorite ?? false,
          isIgnored: node.isIgnored ?? false,
          hopsAway: 0,
          isKeyManuallyVerified: false,
          user: {
            $typeName: "meshtastic.User",
            id: node.userId ?? "",
            longName: node.longName ?? "",
            shortName: node.shortName ?? "",
            macaddr: node.macaddr
              ? hexToUint8Array(node.macaddr)
              : new Uint8Array(),
            hwModel: node.hwModel ?? 0,
            role: node.role ?? 0,
            publicKey: node.publicKey
              ? toByteArray(node.publicKey)
              : new Uint8Array(),
            isLicensed: node.isLicensed ?? false,
          },
          position: create(Protobuf.Mesh.PositionSchema, {
            latitudeI: node.latitudeI ?? 0,
            longitudeI: node.longitudeI ?? 0,
            altitude: node.altitude ?? 0,
            time: node.positionTime
              ? Math.floor(node.positionTime.getTime() / 1000)
              : 0,
            precisionBits: node.positionPrecisionBits ?? 32,
            groundSpeed: node.groundSpeed ?? 0,
            groundTrack: node.groundTrack ?? 0,
            satsInView: node.satsInView ?? 0,
          }),
          deviceMetrics: {
            $typeName: "meshtastic.DeviceMetrics",
            batteryLevel: node.batteryLevel ?? 0,
            voltage: node.voltage ?? 0,
            channelUtilization: node.channelUtilization ?? 0,
            airUtilTx: node.airUtilTx ?? 0,
            uptimeSeconds: node.uptimeSeconds ?? 0,
          },
        };
      });
  }, [allNodes]);

  const myNodeNum = device.hardware?.myNodeNum ?? 0;

  // Get myNode
  const myNode = useMemo(() => {
    return validNodes.find((n) => n.num === myNodeNum);
  }, [validNodes, myNodeNum]);

  // Create getNode helper
  const getNode = useCallback(
    (nodeNum: number) => {
      return validNodes.find((n) => n.num === nodeNum);
    },
    [validNodes],
  );
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();
  const [mapRef, setMapRef] = useState<MapRef | undefined>(undefined);
  const { focusLngLat, fitToNodes } = useMapFitting(mapRef);

  const hasFitBoundsOnce = useRef(false);
  const [snrHover, setSnrHover] = useState<SNRTooltipProps>();
  const [expandedCluster, setExpandedCluster] = useState<string | undefined>();
  const [popupState, setPopupState] = useState<PopupState | undefined>();

  const [visibilityState, setVisibilityState] = useState<VisibilityState>(
    () => defaultVisibilityState,
  );

  // Filters
  const [filterState, setFilterState] = useState<FilterState>(
    () => defaultFilterValues,
  );
  const deferredFilterState = useDeferredValue(filterState);

  const filteredNodes = useMemo(
    () => validNodes.filter((node) => nodeFilter(node, deferredFilterState)),
    [validNodes, deferredFilterState, nodeFilter],
  );

  // Map load handler - stores map ref and fits bounds once
  const handleMapLoad = useCallback(
    (map: MapRef) => {
      setMapRef(map);
      if (!hasFitBoundsOnce.current) {
        fitToNodes(validNodes);
        hasFitBoundsOnce.current = true;
      }
    },
    [fitToNodes, validNodes],
  );

  // SNR lines
  const snrLayerElementId = useId();
  const snrLayerElement = useMemo(
    () => (
      <SNRLayer
        id={snrLayerElementId}
        filteredNodes={filteredNodes}
        myNode={myNode}
        visibilityState={visibilityState}
      />
    ),
    [filteredNodes, myNode, visibilityState, snrLayerElementId],
  );

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const {
        features,
        point: { x, y },
      } = event;
      const hoveredFeature = features?.[0];

      if (hoveredFeature) {
        const { from, to, snr } = hoveredFeature.properties;

        const fromLong =
          getNode(from)?.user?.longName ??
          t("fallbackName", {
            last4: numberToHexUnpadded(from).slice(-4).toUpperCase(),
          });

        const toLong =
          getNode(to)?.user?.longName ??
          t("fallbackName", {
            last4: numberToHexUnpadded(to).slice(-4).toUpperCase(),
          });

        setSnrHover({ pos: { x, y }, snr, from: fromLong, to: toLong });
      } else {
        setSnrHover(undefined);
      }
    },
    [getNode, t],
  );

  // Node markers & clusters
  const onMapBackgroundClick = useCallback(() => {
    setExpandedCluster(undefined);
  }, []);

  const markerElements = useMemo(
    () => (
      <NodesLayer
        mapRef={mapRef}
        filteredNodes={filteredNodes}
        myNode={myNode}
        expandedCluster={expandedCluster}
        setExpandedCluster={setExpandedCluster}
        popupState={popupState}
        setPopupState={setPopupState}
        isVisible={visibilityState.nodeMarkers}
      />
    ),
    [
      filteredNodes,
      expandedCluster,
      mapRef,
      myNode,
      popupState,
      visibilityState.nodeMarkers,
    ],
  );

  // Precision circles
  const precisionCirclesElementId = useId();
  const precisionCirclesElement = useMemo(
    () => (
      <PrecisionLayer
        id={precisionCirclesElementId}
        filteredNodes={filteredNodes}
        isVisible={visibilityState.positionPrecision}
      />
    ),
    [
      filteredNodes,
      visibilityState.positionPrecision,
      precisionCirclesElementId,
    ],
  );

  // Waypoints
  const waypointLayerElement = useMemo(
    () => (
      <WaypointLayer
        mapRef={mapRef}
        myNode={myNode}
        isVisible={visibilityState.waypoints}
        popupState={popupState}
        setPopupState={setPopupState}
      />
    ),
    [mapRef, myNode, visibilityState.waypoints, popupState],
  );

  // Position trails
  const positionTrailsElementId = useId();
  const interactiveLayerIds = useMemo(
    () => [snrLayerElementId],
    [snrLayerElementId],
  );
  const positionTrailsElement = useMemo(
    () => (
      <PositionTrailsLayer
        id={positionTrailsElementId}
        filteredNodes={filteredNodes}
        isVisible={visibilityState.positionTrails}
        trailDurationHours={24}
      />
    ),
    [filteredNodes, visibilityState.positionTrails, positionTrailsElementId],
  );

  return (
    <div>
      <BaseMap
        onLoad={handleMapLoad}
        onMouseMove={onMouseMove}
        onClick={onMapBackgroundClick}
        interactiveLayerIds={interactiveLayerIds}
      >
        {markerElements}
        {positionTrailsElement}
        {snrLayerElement}
        {precisionCirclesElement}
        {waypointLayerElement}

        {snrHover && (
          <SNRTooltip
            pos={snrHover.pos}
            snr={snrHover.snr}
            from={snrHover.from}
            to={snrHover.to}
          />
        )}
      </BaseMap>
      <div className="flex flex-col space-y-1 fixed top-35 right-2.5">
        {myNode && hasPos(myNode?.position) && (
          <button
            type="button"
            className={cn(
              "rounded align-center",
              "w-[29px] px-1 py-1 shadow-l outline-2 outline-stone-600/20",
              "bg-stone-50 hover:bg-stone-200 dark:bg-stone-200 dark:hover:bg-stone-300 ",
              "text-slate-600 hover:text-slate-700",
              "dark:text-slate-600 hover:dark:text-slate-700",
            )}
            aria-label={t("mapMenu.locateAria")}
            onClick={() => focusLngLat(toLngLat(myNode.position))}
          >
            {" "}
            <LocateFixedIcon className="w-[21px]" />
          </button>
        )}

        <FilterControl
          filterState={filterState}
          defaultFilterValues={defaultFilterValues}
          setFilterState={setFilterState}
          isDirty={isFilterDirty(filterState)}
          parameters={{
            popoverContentProps: {
              side: "bottom",
              align: "end",
              sideOffset: 7,
            },
            popoverTriggerClassName: cn(
              "w-[29px] px-1 py-1 rounded shadow-l outline-[2px] outline-stone-600/20 ",
              "dark:text-slate-600 dark:hover:text-slate-700 bg-stone-50 hover:bg-stone-200 dark:bg-stone-200 dark:hover:bg-stone-300 dark:active:bg-stone-300",
              isFilterDirty(filterState)
                ? "text-slate-100 dark:text-slate-100 bg-green-600 dark:bg-green-600 hover:bg-green-700 dark:hover:bg-green-700 hover:text-slate-200 dark:hover:text-slate-200 active:bg-green-800 dark:active:bg-green-800 outline-green-600 dark:outline-green-700"
                : "",
            ),
            triggerIcon: <FunnelIcon className="w-[21px]" />,
            showTextSearch: true,
          }}
        />

        <MapLayerTool
          visibilityState={visibilityState}
          setVisibilityState={setVisibilityState}
        />
      </div>
    </div>
  );
};

export default MapPage;
