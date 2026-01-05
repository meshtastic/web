// State layer barrel export
import { useDeviceContext } from "@shared/hooks/useDeviceContext";
import { type Device, useDeviceStore } from "@state/device";

// Re-export device context (for backwards compatibility)
export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@shared/hooks/useDeviceContext";
// Re-export device store
export {
  type ConfigConflict,
  type ConnectionPhase,
  type Device,
  type Page,
  useDeviceStore,
  type ValidConfigType,
  type ValidModuleConfigType,
  type WaypointWithMetadata,
} from "@state/device";
// Re-export UI store
export {
  type CoordinateFormat,
  DEFAULT_PREFERENCES,
  type DistanceUnits,
  type Language,
  type MapStyle,
  type MessageTab,
  type NodeColumnKey,
  type RasterSource,
  type SplitMode,
  type Theme,
  type TimeFormat,
  type UIState,
  useUIStore,
} from "@state/ui";

// Helper hook to access current device
export const useDevice = (): Device => {
  const { deviceId } = useDeviceContext();
  // Get device from store - do NOT call addDevice in selector as it modifies state
  let device = useDeviceStore((s) => s.getDevice(deviceId));

  // If device doesn't exist, add it outside the selector
  if (!device) {
    device = useDeviceStore.getState().addDevice(deviceId);
  }

  return device;
};
