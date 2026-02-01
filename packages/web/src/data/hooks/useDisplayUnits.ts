import { Protobuf } from "@meshtastic/core";
import { useDevicePreference } from "./useDevicePreference.ts";

/**
 * Hook to get the display units preference for a device.
 * Display units are synced from the device's config when connected.
 * Falls back to METRIC if no preference is set.
 */
export function useDisplayUnits(
  deviceId: number | undefined,
): Protobuf.Config.Config_DisplayConfig_DisplayUnits {
  // Use a stable device ID (0 if undefined) to avoid hook order issues
  const safeDeviceId = deviceId ?? 0;

  const units = useDevicePreference<number>(
    safeDeviceId,
    "displayUnits",
    Protobuf.Config.Config_DisplayConfig_DisplayUnits.METRIC,
  );

  return units as Protobuf.Config.Config_DisplayConfig_DisplayUnits;
}
