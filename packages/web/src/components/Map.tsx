import { useTheme } from "@core/hooks/useTheme.ts";
import { useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import MapGl, {
  AttributionControl,
  type MapLayerMouseEvent,
  MapProvider,
  type MapRef,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/maplibre";

interface MapProps {
  children?: React.ReactNode;
  onLoad?: (map: MapRef) => void;
  onMouseMove?: (event: MapLayerMouseEvent) => void;
  onClick?: (event: MapLayerMouseEvent) => void;
  interactiveLayerIds?: string[];
  initialViewState?: {
    latitude?: number;
    longitude?: number;
    zoom?: number;
  };
  /** When false, disables all user interaction and hides controls */
  interactive?: boolean;
}

export const BaseMap = ({
  children,
  onLoad,
  onClick,
  onMouseMove,
  interactiveLayerIds,
  initialViewState,
  interactive = true,
}: MapProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation("map");

  const darkMode = theme === "dark";
  const mapRef = useRef<MapRef | null>(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const onMouseMoveRef = useRef(onMouseMove);
  onMouseMoveRef.current = onMouseMove;
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const handleLoad = useCallback(() => {
    if (mapRef.current && onLoadRef.current) {
      onLoadRef.current(mapRef.current);
    }
  }, []);

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    onMouseMoveRef.current?.(event);
  }, []);

  const handleClick = useCallback((event: MapLayerMouseEvent) => {
    onClickRef.current?.(event);
  }, []);

  const locale = useMemo(() => {
    return {
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
    };
  }, [t]);

  return (
    <MapProvider>
      <MapGl
        ref={mapRef}
        mapStyle="https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json"
        attributionControl={false}
        renderWorldCopies={false}
        maxPitch={0}
        dragRotate={false}
        touchZoomRotate={false}
        scrollZoom={interactive}
        doubleClickZoom={interactive}
        dragPan={interactive}
        keyboard={interactive}
        initialViewState={
          initialViewState ?? {
            zoom: 1.8,
            latitude: 35,
            longitude: 0,
          }
        }
        style={{ filter: darkMode ? "brightness(0.9)" : undefined }}
        locale={locale}
        interactiveLayerIds={interactive ? interactiveLayerIds : undefined}
        onMouseMove={interactive ? handleMouseMove : undefined}
        onClick={interactive ? handleClick : undefined}
        onLoad={handleLoad}
      >
        {interactive && (
          <>
            <AttributionControl
              style={{
                background: darkMode ? "#ffffff" : undefined,
                color: darkMode ? "black" : undefined,
              }}
            />
            {/* { Disabled for now until we can use i18n for the geolocate control} */}
            {/* <GeolocateControl
              position="top-right"
              i18nIsDynamicList
              positionOptions={{ enableHighAccuracy: true }}
              trackUserLocation
            />  */}
            <NavigationControl position="top-right" showCompass={false} />
            <ScaleControl />
          </>
        )}
        {children}
      </MapGl>
    </MapProvider>
  );
};
