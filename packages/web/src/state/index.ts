// State layer barrel export
import { type Device, useDeviceStore } from "@state/device";

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

/**
 * Hook to access current device from Zustand store.
 *
 * Most components inside connected routes (/$nodeNum/*) can safely use this hook
 * as a device will be guaranteed to exist by the time they render.
 *
 * For components that may render before a device is connected (e.g., AppSidebar),
 * use useDeviceStore directly to check activeDeviceId first.
 */
export const useDevice = (): Device => {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);

  // Get device from store, create if missing (maintains compatibility with previous behavior)
  let device = useDeviceStore((s) => s.getDevice(activeDeviceId));
  if (!device) {
    device = useDeviceStore.getState().addDevice(activeDeviceId);
  }

  return device;
};

/**
 * Hook to access current device, throwing if none exists.
 * Use this in components that are guaranteed to render inside connected routes.
 */
export const useDeviceRequired = (): Device => {
  const device = useDevice();
  if (!device) {
    throw new Error(
      "useDeviceRequired must be used when a device is connected",
    );
  }
  return device;
};
