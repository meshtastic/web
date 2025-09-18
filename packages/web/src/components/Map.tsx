import { useTheme } from "@core/hooks/useTheme.ts";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import MapGl, {
  AttributionControl,
  type MapLayerMouseEvent,
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
}

export const BaseMap = ({
  children,
  onLoad,
  onClick,
  onMouseMove,
  interactiveLayerIds,
}: MapProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation("map");

  const darkMode = theme === "dark";
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (map && onLoad) {
      onLoad(map);
    }
  }, [onLoad]);

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
    <MapGl
      ref={mapRef}
      mapStyle="https://raw.githubusercontent.com/hc-oss/maplibre-gl-styles/master/styles/osm-mapnik/v8/default.json"
      attributionControl={false}
      renderWorldCopies={false}
      maxPitch={0}
      dragRotate={false}
      touchZoomRotate={false}
      initialViewState={{
        zoom: 1.8,
        latitude: 35,
        longitude: 0,
      }}
      style={{ filter: darkMode ? "brightness(0.9)" : undefined }}
      locale={locale}
      interactiveLayerIds={interactiveLayerIds}
      onMouseMove={onMouseMove}
      onClick={onClick}
    >
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
      {children}
    </MapGl>
  );
};
