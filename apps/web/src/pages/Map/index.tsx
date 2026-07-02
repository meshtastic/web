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
import {
  HeatmapLayer,
  type HeatmapMode,
} from "@components/PageComponents/Map/Layers/HeatmapLayer.tsx";
import { NodesLayer } from "@components/PageComponents/Map/Layers/NodesLayer.tsx";
import { GeofenceLayer } from "@components/PageComponents/Map/Layers/GeofenceLayer.tsx";
import { PrecisionLayer } from "@components/PageComponents/Map/Layers/PrecisionLayer.tsx";
import {
  SNRLayer,
  SNRTooltip,
  type SNRTooltipProps,
} from "@components/PageComponents/Map/Layers/SNRLayer.tsx";
import { WaypointLayer } from "@components/PageComponents/Map/Layers/WaypointLayer.tsx";
import type { PopupState } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { WaypointEditDialog } from "@components/Dialog/WaypointEditDialog.tsx";
import { BoundingBoxOverlay } from "@components/PageComponents/Map/BoundingBoxOverlay.tsx";
import { useAppStore, useDevice, type WaypointWithMetadata } from "@core/stores";
import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { useBoundingBoxDraw } from "@core/hooks/useBoundingBoxDraw.ts";
import { useMapFitting } from "@core/hooks/useMapFitting.ts";
import {
  useMyNodeAsProto,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { cn } from "@core/utils/cn.ts";
import { hasPos, type LngLat, toLngLat } from "@core/utils/geo.ts";
import type { Protobuf } from "@meshtastic/sdk";
import { numberToHexUnpadded } from "@noble/curves/utils.js";
import { FunnelIcon, LocateFixedIcon, MapPinPlusIcon } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { type MapLayerMouseEvent, useMap } from "react-map-gl/maplibre";

const MapPage = () => {
  const { t } = useTranslation("map");
  const allNodes = useNodesAsProto();
  const getNode = useCallback(
    (n: number) => allNodes.find((node) => node.num === n),
    [allNodes],
  );
  const validNodes = useMemo(
    () =>
      allNodes.filter((n): n is Protobuf.Mesh.NodeInfo =>
        Boolean(n.position?.latitudeI),
      ),
    [allNodes],
  );
  const myNode = useMyNodeAsProto();
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();
  const { default: mapRef } = useMap();
  const { focusLngLat, fitToNodes } = useMapFitting(mapRef);

  const hasFitBoundsOnce = useRef(false);
  const [snrHover, setSnrHover] = useState<SNRTooltipProps>();
  const [expandedCluster, setExpandedCluster] = useState<string | undefined>();
  const [popupState, setPopupState] = useState<PopupState | undefined>();

  // Waypoint editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorWaypoint, setEditorWaypoint] = useState<WaypointWithMetadata | undefined>();
  const [editorInitialLngLat, setEditorInitialLngLat] = useState<LngLat | undefined>();
  const [placementMode, setPlacementMode] = useState(false);
  const boxDraw = useBoundingBoxDraw(mapRef);

  const openEditor = useCallback((wp: WaypointWithMetadata) => {
    setEditorWaypoint(wp);
    setEditorInitialLngLat(undefined);
    setEditorOpen(true);
  }, []);

  const openCreator = useCallback((lngLat: LngLat) => {
    setEditorWaypoint(undefined);
    setEditorInitialLngLat(lngLat);
    setEditorOpen(true);
  }, []);

  useEffect(() => {
    if (!placementMode) return;
    const map = mapRef?.getMap();
    if (!map) return;
    const canvas = map.getCanvas();
    const prev = canvas.style.cursor;
    // Matches the `MapPinPlus` lucide icon used on the placement toggle button
    // so the cursor advertises the same affordance while positioning a waypoint.
    const pinSvg =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.914 11.105A7.298 7.298 0 0 0 20 10a8 8 0 0 0-16 0c0 4.993 5.539 10.193 7.399 11.799a1 1 0 0 0 1.202 0 32 32 0 0 0 .824-.738"/><circle cx="12" cy="10" r="3"/><path d="M16 18h6"/><path d="M19 15v6"/></svg>',
      );
    canvas.style.cursor = `url("${pinSvg}") 16 29, auto`;
    return () => {
      canvas.style.cursor = prev;
    };
  }, [mapRef, placementMode]);

  const [visibilityState, setVisibilityState] = useState<VisibilityState>(
    () => defaultVisibilityState,
  );
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("density");

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

  // Heatmap
  const heatmapLayerElementId = useId();
  const heatmapLayerElement = useMemo(
    () => (
      <HeatmapLayer
        id={heatmapLayerElementId}
        filteredNodes={filteredNodes}
        isVisible={visibilityState.heatmap}
        mode={heatmapMode}
      />
    ),
    [
      filteredNodes,
      visibilityState.heatmap,
      heatmapMode,
      heatmapLayerElementId,
    ],
  );

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const {
        features,
        point: { x, y },
      } = event;
      const hoveredFeature = features?.[0];

      if (hoveredFeature) {
        const { from, to, snr, name, shortName, num } =
          hoveredFeature.properties;

        // Handle Heatmap Hover
        if (
          hoveredFeature.layer.id === `${heatmapLayerElementId}-interaction` &&
          name !== undefined
        ) {
          setSnrHover({
            pos: { x, y },
            snr: snr, // Single node SNR
            from:
              name ||
              shortName ||
              t("fallbackName", {
                last4: numberToHexUnpadded(num).slice(-4).toUpperCase(),
              }),
            to: undefined, // Single node
          });
          return;
        }

        // Handle SNR Line Hover
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
    [getNode, t, heatmapLayerElementId],
  );

  // Node markers & clusters + placement-mode capture
  const onMapBackgroundClick = useCallback(
    (event: MapLayerMouseEvent) => {
      setExpandedCluster(undefined);
      if (placementMode) {
        openCreator([event.lngLat.lng, event.lngLat.lat]);
        setPlacementMode(false);
      }
    },
    [openCreator, placementMode],
  );

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
        onEditWaypoint={openEditor}
      />
    ),
    [mapRef, myNode, visibilityState.waypoints, popupState, openEditor],
  );

  // Geofence overlays
  const { waypoints } = useDevice();

  // Deep-link focus from geofence alert toasts.
  const focusWaypointId = useAppStore((s) => s.focusWaypointId);
  const setFocusWaypointId = useAppStore((s) => s.setFocusWaypointId);
  useEffect(() => {
    if (focusWaypointId === undefined || !mapRef) return;
    const wp = waypoints.find((w) => w.id === focusWaypointId);
    if (!wp) return;
    focusLngLat(toLngLat({ latitudeI: wp.latitudeI, longitudeI: wp.longitudeI }));
    setPopupState({ type: "waypoint", waypoint: wp });
    setFocusWaypointId(undefined);
  }, [focusWaypointId, focusLngLat, mapRef, setFocusWaypointId, waypoints]);

  const geofenceLayerElementId = useId();
  const geofenceLayerElement = useMemo(
    () => (
      <GeofenceLayer
        id={geofenceLayerElementId}
        waypoints={waypoints}
        isVisible={visibilityState.geofences}
      />
    ),
    [waypoints, visibilityState.geofences, geofenceLayerElementId],
  );

  return (
    <PageLayout label="Map" noPadding actions={[]} leftBar={<Sidebar />}>
      <BaseMap
        onLoad={getMapBounds}
        onMouseMove={onMouseMove}
        onClick={onMapBackgroundClick}
        interactiveLayerIds={[
          snrLayerElementId,
          `${heatmapLayerElementId}-interaction`,
        ]}
      >
        {heatmapLayerElement}
        {markerElements}
        {snrLayerElement}
        {precisionCirclesElement}
        {geofenceLayerElement}
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

      {placementMode && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900/90 text-white text-xs px-4 py-2 shadow-md flex items-center gap-3">
          <span>{t("waypointEdit.placementHint")}</span>
          <button
            type="button"
            className="text-slate-300 hover:text-white underline"
            onClick={() => setPlacementMode(false)}
          >
            {t("waypointEdit.cancel")}
          </button>
        </div>
      )}

      <WaypointEditDialog
        open={editorOpen && !boxDraw.active}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditorWaypoint(undefined);
            setEditorInitialLngLat(undefined);
          }
        }}
        waypoint={editorWaypoint}
        initialLngLat={editorInitialLngLat}
        channel={0}
        mapRef={mapRef}
        onRequestBoundingBoxDraw={boxDraw.beginDraw}
      />

      {boxDraw.active && (
        <>
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full bg-slate-900/90 text-white text-xs px-4 py-2 shadow-md flex items-center gap-3">
            <span>{t("waypointEdit.drawHint")}</span>
            <button
              type="button"
              className="text-slate-300 hover:text-white underline"
              onClick={() => boxDraw.cancelDraw()}
            >
              {t("waypointEdit.cancel")}
            </button>
          </div>
          <div
            className="fixed inset-0 z-40 cursor-crosshair"
            onPointerDown={boxDraw.onPointerDown}
            onPointerMove={boxDraw.onPointerMove}
            onPointerUp={boxDraw.onPointerUp}
          >
            {boxDraw.overlay?.start && boxDraw.overlay.current && mapRef && (
              <BoundingBoxOverlay
                mapRef={mapRef}
                start={boxDraw.overlay.start}
                current={boxDraw.overlay.current}
              />
            )}
          </div>
        </>
      )}

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
          heatmapMode={heatmapMode}
          setHeatmapMode={setHeatmapMode}
        />

        <button
          type="button"
          className={cn(
            "rounded align-center",
            "w-[29px] px-1 py-1 shadow-l outline-[2px] outline-stone-600/20",
            "bg-stone-50 hover:bg-stone-200 dark:bg-stone-200 dark:hover:bg-stone-300 ",
            "text-slate-600 hover:text-slate-700",
            "dark:text-slate-600 hover:dark:text-slate-700",
            placementMode &&
              "bg-amber-500 text-white dark:bg-amber-500 hover:bg-amber-600 dark:hover:bg-amber-600",
          )}
          aria-label={t("waypointEdit.newWaypointAria")}
          title={t("waypointEdit.newWaypointAria")}
          onClick={() => setPlacementMode((v) => !v)}
        >
          <MapPinPlusIcon className="w-[21px]" />
        </button>
      </div>
    </PageLayout>
  );
};

export default MapPage;
