import { Protobuf } from "@meshtastic/core";
import { useDeviceStore } from "@state/device";

/**
 * Hook to get the display units preference from the device's DisplayConfig.
 * Reads directly from the device store to ensure it reflects any changes
 * made outside this app.
 * Falls back to METRIC if no device is connected.
 */
export function useDisplayUnits(): Protobuf.Config.Config_DisplayConfig_DisplayUnits {
  return useDeviceStore(
    (s) =>
      s.device?.config.display?.units ??
      Protobuf.Config.Config_DisplayConfig_DisplayUnits.METRIC,
  );
}
