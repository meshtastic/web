import { useTheme } from "@core/hooks/useTheme.ts";
import { useEffect, useRef } from "react";
import MapGl, {
  AttributionControl,
  type MapRef,
  NavigationControl,
  ScaleControl,
} from "react-map-gl/maplibre";

interface MapProps {
  children?: React.ReactNode;
  onLoad?: (map: MapRef) => void;
}

export const BaseMap = ({ children, onLoad }: MapProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (map && onLoad) {
      onLoad(map);
    }
  }, [onLoad]);

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
