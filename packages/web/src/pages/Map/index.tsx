import {
  defaultVisibilityState,
  MapLayerTool,
  type VisibilityState,
} from "@app/components/PageComponents/Map/Tools/MapLayerTool.tsx";
import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { BaseMap } from "@components/Map.tsx";
import { NodesLayer } from "@components/PageComponents/Map/Layers/NodesLayer.tsx";
import { PrecisionLayer } from "@components/PageComponents/Map/Layers/PrecisionLayer.tsx";
import {
  SNRLayer,
  SNRTooltip,
  type SNRTooltipProps,
} from "@components/PageComponents/Map/Layers/SNRLayer.tsx";
import { WaypointLayer } from "@components/PageComponents/Map/Layers/WaypointLayer.tsx";
import type { PopupState } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useMapFitting } from "@core/hooks/useMapFitting.ts";
import { useNodeDB } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { hasPos, toLngLat } from "@core/utils/geo.ts";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
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
import { type MapLayerMouseEvent, useMap } from "react-map-gl/maplibre";

const NODEDB_DEBOUNCE_MS = 250;

const MapPage = () => {
  const { t } = useTranslation("map");
  const { getNode } = useNodeDB();
  const { nodes: validNodes, myNode } = useNodeDB(
    (db) => ({
      // only nodes with a position
      nodes: db.getNodes((n): n is Protobuf.Mesh.NodeInfo =>
        Boolean(n.position?.latitudeI),
      ),
      myNode: db.getMyNode(),

      // References to cause re-render on change
      _errorsRef: db.nodeErrors,
      _nodeNumRef: db.myNodeNum,
    }),
    { debounce: NODEDB_DEBOUNCE_MS },
  );
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();
  const { default: mapRef } = useMap();
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

  // Map fitting
  const getMapBounds = useCallback(() => {
    if (!hasFitBoundsOnce.current) {
      fitToNodes(validNodes);
      hasFitBoundsOnce.current = true;
    }
  }, [fitToNodes, validNodes]);

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

  return (
    <PageLayout label="Map" noPadding actions={[]} leftBar={<Sidebar />}>
      <BaseMap
        onLoad={getMapBounds}
        onMouseMove={onMouseMove}
        onClick={onMapBackgroundClick}
        interactiveLayerIds={[snrLayerElementId]}
      >
        {markerElements}
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
              "w-[29px] px-1 py-1 shadow-l outline-[2px] outline-stone-600/20",
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
    </PageLayout>
  );
};

export default MapPage;
