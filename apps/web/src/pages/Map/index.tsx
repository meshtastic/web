import { FilterControl } from "@components/generic/Filter/FilterControl.tsx";
import {
  type FilterState,
  useFilterNode,
} from "@components/generic/Filter/useFilterNode.ts";
import { LayersControl } from "@components/Map/LayersControl.tsx";
import { MapControls } from "@components/Map/MapControls.tsx";
import { MapNodeList } from "@components/Map/MapNodeList.tsx";
import { MeshMap } from "@components/Map/MeshMap.tsx";
import { NodePins } from "@components/Map/NodePins.tsx";
import { SelectedNodeCard } from "@components/Map/SelectedNodeCard.tsx";
import { NodeResponseDialogs } from "@components/Nodes/NodeResponseDialogs.tsx";
import { useCollator } from "@components/Nodes/useCollator.ts";
import { useNodeActions } from "@components/Nodes/useNodeActions.ts";
import { useNodeLabels } from "@components/Nodes/useNodeLabels.ts";
import { useNodeRows } from "@components/Nodes/useNodeRows.ts";
import {
  HeatmapLayer,
  type HeatmapMode,
} from "@components/PageComponents/Map/Layers/HeatmapLayer.tsx";
import {
  generatePrecisionCircles,
  PrecisionLayer,
  SourcePrecisionCircles,
} from "@components/PageComponents/Map/Layers/PrecisionLayer.tsx";
import {
  SNRLayer,
  SNRTooltip,
  type SNRTooltipProps,
} from "@components/PageComponents/Map/Layers/SNRLayer.tsx";
import { WaypointLayer } from "@components/PageComponents/Map/Layers/WaypointLayer.tsx";
import type { PopupState } from "@components/PageComponents/Map/Popups/PopupWrapper.tsx";
import { ShellPage } from "@components/Shell/ShellPage.tsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@components/shadcn/drawer.tsx";
import { Button } from "@components/UI/Button.tsx";
import { IconButton } from "@components/UI/IconButton.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/UI/Popover.tsx";
import { useIsMobile } from "@core/hooks/useIsMobile.ts";
import { useMapFitting } from "@core/hooks/useMapFitting.ts";
import { createLogger } from "@core/log.ts";
import {
  defaultVisibilityState,
  type MapLayerKey,
  toggleLayer,
  type VisibilityState,
} from "@core/nodes/mapLayers.ts";
import {
  derivePins,
  nodeAtLngLat,
  pinLabelsAtZoom,
} from "@core/nodes/mapPins.ts";
import {
  DESKTOP_FIT_PADDING,
  type FitPhase,
  initialFitPhase,
  MAP_LAYERS_PANEL_WIDTH,
  MAP_NODE_PANEL_WIDTH,
  MAP_OVERLAY_INSET,
  MAP_VIEW_STORAGE_KEY,
  MOBILE_FIT_PADDING,
  nextFitStep,
  parseMapView,
  pickInitialView,
  serializeMapView,
  shouldPersistMove,
  viewFromRouteParams,
} from "@core/nodes/mapView.ts";
import { matchesNodeSearch } from "@core/nodes/nodeFilters.ts";
import type { NodeRow } from "@core/nodes/nodeRow.ts";
import { sortNodeRows } from "@core/nodes/nodeSort.ts";
import { hasPos } from "@core/utils/geo.ts";
import { useParams } from "@tanstack/react-router";
import { FunnelIcon, LayersIcon, ListIcon } from "lucide-react";
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
import {
  type MapLayerMouseEvent,
  Marker,
  useMap,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";

const log = createLogger("MapPage");

const readSavedView = () => {
  try {
    return parseMapView(globalThis.localStorage?.getItem(MAP_VIEW_STORAGE_KEY));
  } catch (error) {
    log.warn("failed to read saved map view", { error: String(error) });
    return undefined;
  }
};

const textProp = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const numberProp = (value: unknown): number | undefined => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
};

/** This device first, then the most recently heard. */
const orderForList = (
  rows: readonly NodeRow[],
  collator: Intl.Collator,
): NodeRow[] => {
  const sorted = sortNodeRows(
    rows,
    { key: "lastHeard", direction: "desc" },
    collator,
  );
  return [
    ...sorted.filter((row) => row.isSelf),
    ...sorted.filter((row) => !row.isSelf),
  ];
};

const MapPage = () => {
  const { t } = useTranslation("map");
  const isMobile = useIsMobile();
  const { rows, sources, myNodeNum, now } = useNodeRows();
  const labels = useNodeLabels(now);
  const collator = useCollator();
  const { default: mapRef } = useMap();
  const { focusLngLat, fitToNodes } = useMapFitting(
    mapRef,
    isMobile ? MOBILE_FIT_PADDING : DESKTOP_FIT_PADDING,
  );
  const { nodeFilter, defaultFilterValues, isFilterDirty } = useFilterNode();

  // Where to open: a /map/$long/$lat/$zoom link, else the last view, else fit.
  const routeParams = useParams({ strict: false });
  const routeView = viewFromRouteParams(routeParams);
  // A string, so effects follow the link itself, not the params object.
  const routeKey = routeView
    ? `${routeView.longitude},${routeView.latitude},${routeView.zoom}`
    : "";
  const [initialView] = useState(() =>
    pickInitialView(routeView, readSavedView()),
  );
  const fitPhase = useRef<FitPhase>(initialFitPhase(initialView));
  const [mapLoaded, setMapLoaded] = useState(false);
  // Only the label threshold matters to pins, so they skip zoom changes.
  const [zoomedIn, setZoomedIn] = useState(
    initialView.kind !== "fitNodes" && pinLabelsAtZoom(initialView.view.zoom),
  );

  const [filterState, setFilterState] = useState<FilterState>(
    () => defaultFilterValues,
  );
  const deferredFilterState = useDeferredValue(filterState);
  const filtersDirty = isFilterDirty(filterState);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  // undefined: nothing picked yet (a link's target applies); null: cleared.
  const [picked, setPicked] = useState<number | null | undefined>();
  // The link the current selection follows; a new link resets the pick so
  // its target node is selected (state adjusted during render, not in an
  // effect).
  const [pickedForRoute, setPickedForRoute] = useState(routeKey);
  if (pickedForRoute !== routeKey) {
    setPickedForRoute(routeKey);
    setPicked(undefined);
  }
  const [expandedCluster, setExpandedCluster] = useState<string | undefined>();
  const [popupState, setPopupState] = useState<PopupState | undefined>();
  const [visibility, setVisibility] = useState<VisibilityState>(
    () => defaultVisibilityState,
  );
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("density");
  const [snrHover, setSnrHover] = useState<SNRTooltipProps>();
  const [listOpen, setListOpen] = useState(false);

  // Nodes with a position that pass the advanced filters.
  const filteredNodes = useMemo(
    () =>
      sources.filter(
        (node) =>
          hasPos(node.position) && nodeFilter(node, deferredFilterState),
      ),
    [sources, nodeFilter, deferredFilterState],
  );
  const myNode = useMemo(
    () => sources.find((node) => node.num === myNodeNum),
    [sources, myNodeNum],
  );
  const rowsByNum = useMemo(
    () => new Map(rows.map((row) => [row.num, row])),
    [rows],
  );
  const placedRows = useMemo(() => {
    const nums = new Set(filteredNodes.map((node) => node.num));
    return rows.filter((row) => nums.has(row.num) && row.lngLat);
  }, [rows, filteredNodes]);
  // A "Show on map" link selects the node at its point until the user picks.
  const routeLng = routeView?.longitude;
  const routeLat = routeView?.latitude;
  const routeTargetNum = useMemo(
    () =>
      routeLng === undefined || routeLat === undefined
        ? undefined
        : nodeAtLngLat(placedRows, [routeLng, routeLat])?.num,
    [routeLng, routeLat, placedRows],
  );
  const selectedNum =
    picked === undefined ? routeTargetNum : (picked ?? undefined);
  const listRows = useMemo(
    () =>
      orderForList(
        placedRows.filter((row) => matchesNodeSearch(row, deferredSearch)),
        collator,
      ),
    [placedRows, deferredSearch, collator],
  );
  // Pins not matching the list search are faded rather than hidden.
  const matchingNums = useMemo(
    () =>
      deferredSearch.trim() === ""
        ? undefined
        : new Set(listRows.map((row) => row.num)),
    [listRows, deferredSearch],
  );
  const pinModel = useMemo(
    () =>
      derivePins(visibility.nodeMarkers ? placedRows : [], {
        myNodeNum,
        selectedNum,
        expandedCluster,
      }),
    [
      placedRows,
      visibility.nodeMarkers,
      myNodeNum,
      selectedNum,
      expandedCluster,
    ],
  );

  const selectedRow =
    selectedNum === undefined ? undefined : rowsByNum.get(selectedNum);

  const actions = useNodeActions(selectedRow);
  const selectedNode = useMemo(
    () => filteredNodes.find((node) => node.num === selectedNum),
    [filteredNodes, selectedNum],
  );
  // The selected node's precision circle shows even with the layer off.
  const selectedPrecision = useMemo(
    () => (selectedNode ? generatePrecisionCircles([selectedNode]) : undefined),
    [selectedNode],
  );
  const myRow = myNodeNum === undefined ? undefined : rowsByNum.get(myNodeNum);
  const myLngLat = myRow?.lngLat;

  // A link followed while the map is open (e.g. "Show on map" from the
  // node card) moves the camera; the first one is the initial view.
  const lastRouteKey = useRef(routeKey);
  useEffect(() => {
    if (!mapRef || !routeView || lastRouteKey.current === routeKey) {
      return;
    }
    lastRouteKey.current = routeKey;
    mapRef.easeTo({
      center: [routeView.longitude, routeView.latitude],
      zoom: routeView.zoom,
    });
  }, [mapRef, routeKey, routeView]);

  // With no view to restore, fit once the map and the nodes are both ready,
  // and once more if that first fit only saw a single node.
  useEffect(() => {
    if (!mapLoaded) {
      return;
    }
    const step = nextFitStep(fitPhase.current, filteredNodes.length);
    fitPhase.current = step.phase;
    if (step.fit) {
      fitToNodes(filteredNodes);
    }
  }, [mapLoaded, filteredNodes, fitToNodes]);

  const handleMoveEnd = useCallback(
    (event: ViewStateChangeEvent) => {
      const { longitude, latitude, zoom: nextZoom } = event.viewState;
      setZoomedIn(pinLabelsAtZoom(nextZoom));
      // Fits, link targets and resizes have no originating input event.
      const userInitiated = event.originalEvent !== undefined;
      if (userInitiated) {
        // The user has picked a view; stop fitting to nodes.
        fitPhase.current = "done";
      }
      if (
        !shouldPersistMove({
          userInitiated,
          initialViewApplied: mapLoaded,
        })
      ) {
        return;
      }
      try {
        globalThis.localStorage?.setItem(
          MAP_VIEW_STORAGE_KEY,
          serializeMapView({ longitude, latitude, zoom: nextZoom }),
        );
      } catch (error) {
        log.warn("failed to persist map view", { error: String(error) });
      }
    },
    [mapLoaded],
  );

  const selectNode = useCallback(
    (num: number) => {
      setPicked(num);
      setListOpen(false);
      const lngLat = rowsByNum.get(num)?.lngLat;
      if (lngLat) {
        focusLngLat(lngLat);
      }
    },
    [rowsByNum, focusLngLat],
  );

  const listRef = useRef<HTMLElement>(null);

  // Closing the card returns focus to the node's list item, else the map.
  const closeCard = useCallback(() => {
    const num = selectedNum;
    setPicked(null);
    requestAnimationFrame(() => {
      const item =
        num === undefined
          ? null
          : listRef.current?.querySelector<HTMLElement>(
              `[data-node-num="${num}"]`,
            );
      if (item) {
        item.focus();
      } else {
        mapRef?.getCanvas().focus();
      }
    });
  }, [selectedNum, mapRef]);

  const onMapClick = useCallback(() => {
    setExpandedCluster(undefined);
    setPicked(null);
  }, []);

  const snrLayerId = useId();
  const heatmapLayerId = useId();
  const precisionLayerId = useId();

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) {
        setSnrHover(undefined);
        return;
      }
      const pos = { x: event.point.x, y: event.point.y };
      const props = feature.properties;
      const snr = numberProp(props.snr) ?? 0;
      const nameOf = (num: number | undefined) =>
        num === undefined ? undefined : rowsByNum.get(num)?.name;
      if (feature.layer.id === `${heatmapLayerId}-interaction`) {
        const num = numberProp(props.num);
        setSnrHover({
          pos,
          snr,
          from:
            textProp(props.name) ??
            textProp(props.shortName) ??
            nameOf(num) ??
            labels.notAvailable,
          to: undefined,
        });
        return;
      }
      setSnrHover({
        pos,
        snr,
        from: nameOf(numberProp(props.from)) ?? labels.notAvailable,
        to: nameOf(numberProp(props.to)) ?? labels.notAvailable,
      });
    },
    [heatmapLayerId, rowsByNum, labels.notAvailable],
  );

  const toggle = (key: MapLayerKey) =>
    setVisibility((current) => toggleLayer(current, key));

  const map = mapRef?.getMap();
  const controls = (
    <MapControls
      onCenter={myLngLat ? () => focusLngLat(myLngLat) : undefined}
      onZoomIn={() => map?.zoomIn()}
      onZoomOut={() => map?.zoomOut()}
    />
  );

  const layers = (
    <LayersControl
      visibility={visibility}
      onToggle={toggle}
      heatmapMode={heatmapMode}
      onHeatmapModeChange={setHeatmapMode}
    />
  );

  const filters = (
    <FilterControl
      filterState={filterState}
      defaultFilterValues={defaultFilterValues}
      setFilterState={setFilterState}
      isDirty={filtersDirty}
      parameters={{
        popoverContentProps: { side: "bottom", align: "end", sideOffset: 8 },
        popoverTriggerClassName: [
          "relative flex size-[38px] shrink-0 items-center justify-center rounded-control border border-control pointer-coarse:touch-target",
          "bg-app text-muted hover:bg-raised hover:text-primary active:bg-raised",
          "dark:bg-app dark:text-muted hover:dark:bg-raised hover:dark:text-primary dark:active:bg-raised",
          "focus-visible:outline-2 focus-visible:outline-focus",
          filtersDirty
            ? "border-accent bg-accent-tint text-accent dark:bg-accent-tint dark:text-accent hover:bg-accent-tint hover:dark:bg-accent-tint"
            : "",
        ].join(" "),
        triggerIcon: <FunnelIcon aria-hidden="true" className="size-4" />,
      }}
    />
  );

  const nodeList = (
    <MapNodeList
      rows={listRows}
      total={placedRows.length}
      search={search}
      onSearchChange={setSearch}
      selectedNum={selectedNum}
      onSelect={selectNode}
      labels={labels}
      tools={filters}
      showHeading={false}
      className="h-full"
    />
  );

  const selectedCard = selectedRow ? (
    <SelectedNodeCard
      row={selectedRow}
      labels={labels}
      actions={actions}
      onClose={closeCard}
      className={isMobile ? "w-auto" : undefined}
    />
  ) : null;

  const selectedPin = pinModel.pins.find((pin) => pin.isSelected);
  const title = t("navigation.map", { ns: "ui" });

  return (
    <ShellPage label={title} noPadding>
      <h1 className="sr-only">{title}</h1>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {isMobile ? (
          <>
            <div className="absolute top-3 left-3 z-10 flex gap-2">
              <Drawer open={listOpen} onOpenChange={setListOpen}>
                <DrawerTrigger asChild>
                  <Button
                    variant="secondary"
                    size="touch"
                    className="border border-control bg-surface shadow-floating"
                    icon={<ListIcon aria-hidden="true" className="size-4" />}
                  >
                    {t("page.showNodes")}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[70dvh] border-subtle bg-surface pb-[env(safe-area-inset-bottom)] text-primary">
                  <DrawerTitle className="sr-only">
                    {t("page.nodeListLabel")}
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">
                    {t("page.nodesWithPosition", { count: placedRows.length })}
                  </DrawerDescription>
                  {nodeList}
                </DrawerContent>
              </Drawer>
            </div>
            <div className="absolute top-3 right-3 z-10">
              <Popover>
                <PopoverTrigger asChild>
                  <IconButton
                    aria-label={t("layers.open")}
                    size="touch"
                    className="border border-control bg-surface text-primary shadow-floating"
                    icon={<LayersIcon className="size-5" />}
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="border-0 bg-transparent p-0 shadow-none"
                  style={{ width: MAP_LAYERS_PANEL_WIDTH }}
                >
                  {layers}
                </PopoverContent>
              </Popover>
            </div>
            <div className="absolute right-3 bottom-20 z-10">{controls}</div>
            {selectedCard ? (
              <div className="absolute inset-x-3 bottom-3 z-10 mr-14">
                {selectedCard}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {/* Panel sizes come from the constants the fit padding uses. */}
            <section
              ref={listRef}
              aria-label={t("page.nodeListLabel")}
              className="absolute z-10 flex flex-col overflow-hidden rounded-panel border border-control bg-surface shadow-dialog"
              style={{
                top: MAP_OVERLAY_INSET,
                bottom: MAP_OVERLAY_INSET,
                left: MAP_OVERLAY_INSET,
                width: MAP_NODE_PANEL_WIDTH,
              }}
            >
              {nodeList}
            </section>
            <div
              className="absolute z-10"
              style={{
                top: MAP_OVERLAY_INSET,
                right: MAP_OVERLAY_INSET,
                width: MAP_LAYERS_PANEL_WIDTH,
              }}
            >
              {layers}
            </div>
            <div
              className="absolute bottom-20 z-10"
              style={{ right: MAP_OVERLAY_INSET }}
            >
              {controls}
            </div>
          </>
        )}
        <MeshMap
          initialView={
            initialView.kind === "fitNodes" ? undefined : initialView.view
          }
          onLoad={() => setMapLoaded(true)}
          onMoveEnd={handleMoveEnd}
          onMouseMove={onMouseMove}
          onClick={onMapClick}
          interactiveLayerIds={[snrLayerId, `${heatmapLayerId}-interaction`]}
        >
          <HeatmapLayer
            id={heatmapLayerId}
            filteredNodes={filteredNodes}
            isVisible={visibility.heatmap}
            mode={heatmapMode}
          />
          <SNRLayer
            id={snrLayerId}
            filteredNodes={filteredNodes}
            myNode={myNode}
            visibilityState={visibility}
          />
          <PrecisionLayer
            id={precisionLayerId}
            filteredNodes={filteredNodes}
            isVisible={visibility.positionPrecision}
          />
          {selectedPrecision && !visibility.positionPrecision ? (
            <SourcePrecisionCircles
              id={`${precisionLayerId}-selected`}
              data={selectedPrecision}
              isVisible
            />
          ) : null}
          <WaypointLayer
            mapRef={mapRef}
            myNode={myNode}
            isVisible={visibility.waypoints}
            popupState={popupState}
            setPopupState={setPopupState}
          />
          <NodePins
            pins={pinModel.pins}
            stacks={pinModel.stacks}
            rowsByNum={rowsByNum}
            zoomedIn={zoomedIn}
            matchingNums={matchingNums}
            onSelect={selectNode}
            onExpandStack={setExpandedCluster}
          />
          {!isMobile && selectedCard && selectedRow?.lngLat ? (
            <Marker
              longitude={selectedRow.lngLat[0]}
              latitude={selectedRow.lngLat[1]}
              anchor="top-left"
              offset={[
                (selectedPin?.offsetPx[0] ?? 0) + 24,
                (selectedPin?.offsetPx[1] ?? 0) + 24,
              ]}
              style={{ zIndex: 4 }}
              onClick={(event) => event.originalEvent.stopPropagation()}
            >
              {selectedCard}
            </Marker>
          ) : null}
          {snrHover ? (
            <SNRTooltip
              pos={snrHover.pos}
              snr={snrHover.snr}
              from={snrHover.from}
              to={snrHover.to}
            />
          ) : null}
        </MeshMap>
      </div>
      <NodeResponseDialogs />
    </ShellPage>
  );
};

export default MapPage;
