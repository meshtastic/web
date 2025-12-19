// State layer barrel export
import { useDeviceContext } from "@core/hooks/useDeviceContext";
import { useDeviceStore, type Device } from "@state/device";

// Re-export device store
export {
  useDeviceStore,
  type Device,
  type Page,
  type ValidConfigType,
  type ValidModuleConfigType,
  type WaypointWithMetadata,
} from "@state/device";

// Re-export UI store
export {
  useUIStore,
  type CoordinateFormat,
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
} from "@state/ui";

// Re-export device context (for backwards compatibility)
export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@core/hooks/useDeviceContext";

// Helper hook to access current device
export const useDevice = (): Device => {
  const { deviceId } = useDeviceContext();
  const device = useDeviceStore(
    (s) => s.getDevice(deviceId) ?? s.addDevice(deviceId),
  );
  return device;
};
