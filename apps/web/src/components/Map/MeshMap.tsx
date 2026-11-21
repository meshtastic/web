import { useIsMobile } from "@core/hooks/useIsMobile.ts";
import { useTheme } from "@core/hooks/useTheme.ts";
import type { MapView } from "@core/nodes/mapView.ts";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import MapGl, {
  AttributionControl,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
  ScaleControl,
} from "react-map-gl/maplibre";

const MAP_STYLE =
  "https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json";

const WORLD_VIEW: MapView = { longitude: 0, latitude: 35, zoom: 1.8 };

export interface MeshMapProps {
  children?: ReactNode;
  initialView?: MapView;
  onLoad?: () => void;
  onMoveEnd?: (event: ViewStateChangeEvent) => void;
  onMouseMove?: (event: MapLayerMouseEvent) => void;
  onClick?: (event: MapLayerMouseEvent) => void;
  interactiveLayerIds?: string[];
}

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
}: MeshMapProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation("map");
  const isMobile = useIsMobile();

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

  return (
    <MapGl
      mapStyle={MAP_STYLE}
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
