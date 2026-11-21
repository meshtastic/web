import { useIsMobile } from "@core/hooks/useIsMobile.ts";
import { useTheme } from "@core/hooks/useTheme.ts";
import { Button } from "@components/UI/Button.tsx";
import { EmptyState } from "@components/UI/EmptyState.tsx";
import { createLogger } from "@core/log.ts";
import { isMapLoadFailure, type MapView } from "@core/nodes/mapView.ts";
import { MapPinOffIcon, RotateCwIcon } from "lucide-react";
// maplibre derives its worker's URL from its own module URL, which points
// into Vite's pre-bundled deps (dev) or a hashed chunk (build) where no
// worker file exists. Without a worker, GeoJSON sources never load and the
// map's `load` event never fires. Importing it as a Vite worker URL serves
// it from the dev server and emits it as its own file in builds.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import MapGl, {
  AttributionControl,
  type ErrorEvent,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
  ScaleControl,
} from "react-map-gl/maplibre";

const MAP_STYLE =
  "https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json";

const log = createLogger("MeshMap");

const WORLD_VIEW: MapView = { longitude: 0, latitude: 35, zoom: 1.8 };

export interface MeshMapProps {
  children?: ReactNode;
  initialView?: MapView;
  onLoad?: () => void;
  onMoveEnd?: (event: ViewStateChangeEvent) => void;
  onMouseMove?: (event: MapLayerMouseEvent) => void;
  onClick?: (event: MapLayerMouseEvent) => void;
  interactiveLayerIds?: string[];
  /** Defaults to reloading the page, which fetches fresh map code. */
  onReload?: () => void;
}

const reloadPage = () => globalThis.location.reload();

/** Shown in the map's place when the map code could not be loaded. */
export const MapLoadError = ({ onReload }: { onReload: () => void }) => {
  const { t } = useTranslation("map");
  return (
    <div
      role="alert"
      className="flex size-full items-center justify-center bg-app p-6"
    >
      <EmptyState
        icon={<MapPinOffIcon className="size-8" />}
        title={t("loadError.title")}
        description={t("loadError.description")}
        className="max-w-[360px] rounded-panel border border-control bg-surface p-6 shadow-dialog"
      >
        <Button
          icon={<RotateCwIcon aria-hidden="true" className="size-4" />}
          onClick={onReload}
        >
          {t("loadError.reload")}
        </Button>
      </EmptyState>
    </div>
  );
};

/**
 * The maplibre map with the app's tiles, locale strings, attribution and
 * scale. Zoom buttons are drawn by the page as overlay controls, so the
 * built-in navigation control is left out.
 */
export const MeshMap = ({
  children,
  initialView,
  onLoad,
  onMoveEnd,
  onMouseMove,
  onClick,
  interactiveLayerIds,
  onReload = reloadPage,
}: MeshMapProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation("map");
  const isMobile = useIsMobile();
  const [loadFailed, setLoadFailed] = useState(false);

  const onError = useCallback((event: ErrorEvent) => {
    if (isMapLoadFailure(event)) {
      log.error("map failed to load", { error: String(event.error) });
      setLoadFailed(true);
      return;
    }
    log.warn("map error", { error: String(event.error) });
  }, []);

  const locale = useMemo(
    () => ({
      "GeolocateControl.FindMyLocation": t(
        "maplibre.GeolocateControl.FindMyLocation",
      ),
      "NavigationControl.ZoomIn": t("maplibre.NavigationControl.ZoomIn"),
      "NavigationControl.ZoomOut": t("maplibre.NavigationControl.ZoomOut"),
      "ScaleControl.Meters": t("unit.meter.suffix"),
      "ScaleControl.Kilometers": t("unit.kilometer.suffix"),
      "CooperativeGesturesHandler.WindowsHelpText": t(
        "maplibre.CooperativeGesturesHandler.WindowsHelpText",
      ),
      "CooperativeGesturesHandler.MacHelpText": t(
        "maplibre.CooperativeGesturesHandler.MacHelpText",
      ),
      "CooperativeGesturesHandler.MobileHelpText": t(
        "maplibre.CooperativeGesturesHandler.MobileHelpText",
      ),
    }),
    [t],
  );

  if (loadFailed) {
    return <MapLoadError onReload={onReload} />;
  }

  return (
    <MapGl
      mapStyle={MAP_STYLE}
      workerUrl={maplibreWorkerUrl}
      attributionControl={false}
      renderWorldCopies={false}
      maxPitch={0}
      dragRotate={false}
      touchZoomRotate={isMobile}
      initialViewState={initialView ?? WORLD_VIEW}
      // OSM tiles have no dark style; dim them a touch in the dark theme.
      style={{
        width: "100%",
        height: "100%",
        filter: theme === "dark" ? "brightness(0.9)" : undefined,
      }}
      locale={locale}
      interactiveLayerIds={interactiveLayerIds}
      onLoad={onLoad}
      onError={onError}
      onMoveEnd={onMoveEnd}
      onMouseMove={onMouseMove}
      onClick={onClick}
    >
      {/* Bottom-right, clear of the node list panel that covers the left. */}
      <AttributionControl position="bottom-right" compact />
      <ScaleControl position="bottom-right" />
      {children}
    </MapGl>
  );
};
