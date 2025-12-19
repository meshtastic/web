import { BaseMap } from "@features/map/components/Map";
import { useDevice } from "@core/stores";
import { cn } from "@shared/utils/cn";
import { useDevicePreference } from "@data/hooks";
import { Protobuf } from "@meshtastic/core";
import { useMemo } from "react";
import { Marker } from "react-map-gl/maplibre";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  className?: string;
}

const METERS_TO_FEET = 3.28084;

export function MiniMap({
  latitude,
  longitude,
  altitude,
  className,
}: MiniMapProps) {
  const device = useDevice();
  const displayUnits = useDevicePreference<number>(
    device.id,
    "displayUnits",
    Protobuf.Config.Config_DisplayConfig_DisplayUnits.METRIC,
  );

  const initialViewState = useMemo(
    () => ({
      latitude,
      longitude,
      zoom: 14,
    }),
    [latitude, longitude],
  );

  const formattedAltitude = useMemo(() => {
    if (altitude === null || altitude === undefined) {
      return null;
    }
    if (
      displayUnits ===
      Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL
    ) {
      return `${Math.round(altitude * METERS_TO_FEET)} ft`;
    }
    return `${altitude} m`;
  }, [altitude, displayUnits]);

  return (
    <div className={cn(className)}>
      <BaseMap initialViewState={initialViewState} interactive={false}>
        <Marker latitude={latitude} longitude={longitude} anchor="center">
          <div className="relative">
            <div className="h-4 w-4 rounded-full bg-primary border-2 border-white shadow-md" />
            <div className="absolute inset-0 h-4 w-4 rounded-full bg-primary animate-ping opacity-80" />
          </div>
        </Marker>
      </BaseMap>
      {formattedAltitude && (
        <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
          {formattedAltitude}
        </div>
      )}
    </div>
  );
}
