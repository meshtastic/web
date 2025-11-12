import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { BaseMap } from "@components/Map.tsx";
import { Marker, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";
import { useCallback, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores";

interface FixedPositionPickerProps {
  currentPosition?: {
    latitudeI?: number;
    longitudeI?: number;
    altitude?: number;
  };
  isEnabled: boolean;
  onSetPosition: (message: Protobuf.Admin.AdminMessage) => void;
  onRequestUpdate: (message: Protobuf.Admin.AdminMessage) => void;
}

export const FixedPositionPicker = ({
  currentPosition,
  isEnabled,
  onSetPosition,
  onRequestUpdate,
}: FixedPositionPickerProps) => {
  const { t } = useTranslation("config");
  const { toast } = useToast();
  const { getEffectiveConfig } = useDevice();

  // Get display units to show correct altitude unit
  const displayUnits = getEffectiveConfig("display")?.units;
  const altitudeUnit = useMemo(() => {
    return displayUnits === Protobuf.Config.Config_DisplayConfig_DisplayUnits.IMPERIAL
      ? "Feet"
      : "Meters";
  }, [displayUnits]);

  // State for fixed position inputs (in degrees, not integer format)
  const [latitude, setLatitude] = useState<string>(
    currentPosition?.latitudeI ? String(currentPosition.latitudeI / 1e7) : ""
  );
  const [longitude, setLongitude] = useState<string>(
    currentPosition?.longitudeI ? String(currentPosition.longitudeI / 1e7) : ""
  );
  const [altitude, setAltitude] = useState<string>(
    currentPosition?.altitude ? String(currentPosition.altitude) : ""
  );

  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    const { lng, lat } = event.lngLat;
    setLatitude(lat.toFixed(7));
    setLongitude(lng.toFixed(7));
  }, []);

  const handleRequestPosition = useCallback(() => {
    const message = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: {
        case: "getOwnerRequest",
        value: true,
      },
    });

    onRequestUpdate(message);

    toast({
      title: t("position.fixedPosition.requestSent.title"),
      description: t("position.fixedPosition.requestSent.description"),
    });
  }, [onRequestUpdate, toast, t]);

  const handleSetFixedPosition = useCallback(() => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const alt = parseInt(altitude);

    if (isNaN(lat) || isNaN(lon)) {
      toast({
        title: t("position.fixedPosition.error.title"),
        description: t("position.fixedPosition.error.invalidCoordinates"),
        variant: "destructive",
      });
      return;
    }

    // Check if fixedPosition is enabled in config
    if (!isEnabled) {
      toast({
        title: t("position.fixedPosition.error.title"),
        description: t("position.fixedPosition.error.notEnabled"),
        variant: "destructive",
      });
      return;
    }

    // Convert degrees to integer format (multiply by 1e7)
    const latitudeI = Math.round(lat * 1e7);
    const longitudeI = Math.round(lon * 1e7);

    console.log("Setting fixed position:", {
      latitude: lat,
      longitude: lon,
      altitude: isNaN(alt) ? 0 : alt,
      latitudeI,
      longitudeI,
    });

    const message = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant: {
        case: "setFixedPosition",
        value: create(Protobuf.Mesh.PositionSchema, {
          latitudeI,
          longitudeI,
          altitude: isNaN(alt) ? 0 : alt,
          time: Math.floor(Date.now() / 1000),
        }),
      },
    });

    onSetPosition(message);

    toast({
      title: t("position.fixedPosition.success.title"),
      description: t("position.fixedPosition.success.description", {
        lat: lat.toFixed(6),
        lon: lon.toFixed(6),
      }),
    });
  }, [latitude, longitude, altitude, isEnabled, onSetPosition, toast, t]);

  return (
    <div className="mt-4 space-y-3 p-4 border rounded-md bg-muted/50">
      {/* Map Picker */}
      <div className="w-full h-64 rounded-md overflow-hidden border">
        <BaseMap
          onClick={handleMapClick}
          initialViewState={{
            latitude: latitude
              ? parseFloat(latitude)
              : currentPosition?.latitudeI
                ? currentPosition.latitudeI / 1e7
                : 0,
            longitude: longitude
              ? parseFloat(longitude)
              : currentPosition?.longitudeI
                ? currentPosition.longitudeI / 1e7
                : 0,
            zoom: (latitude && longitude) || currentPosition?.latitudeI ? 13 : 1.8,
          }}
        >
          {latitude && longitude && (
            <>
              <Marker
                longitude={parseFloat(longitude)}
                latitude={parseFloat(latitude)}
                anchor="bottom"
              >
                <MapPin className="w-8 h-8 text-red-500 fill-red-500/20" />
              </Marker>
            </>
          )}
        </BaseMap>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {t("position.fixedPosition.map.hint")}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="latitude" className="text-xs font-medium">
            {t("position.fixedPosition.latitude.label")}
          </label>
          <Input
            id="latitude"
            type="number"
            step="any"
            placeholder="37.7749"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="longitude" className="text-xs font-medium">
            {t("position.fixedPosition.longitude.label")}
          </label>
          <Input
            id="longitude"
            type="number"
            step="any"
            placeholder="-122.4194"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="altitude" className="text-xs font-medium">
            {t("position.fixedPosition.altitude.label")}
          </label>
          <Input
            id="altitude"
            type="number"
            placeholder="100"
            value={altitude}
            onChange={(e) => setAltitude(e.target.value)}
            className="h-8 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("position.fixedPosition.altitude.description", { unit: altitudeUnit })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleSetFixedPosition}
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
        >
          {t("position.fixedPosition.setButton")}
        </Button>
        <Button
          onClick={handleRequestPosition}
          variant="subtle"
          size="sm"
          className="flex-1 sm:flex-none"
        >
          {t("position.fixedPosition.requestButton")}
        </Button>
      </div>
    </div>
  );
};
