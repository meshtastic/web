// State layer barrel export
import { type Device, useDeviceStore } from "@state/device";

// Re-export device store
export {
  type ConfigConflict,
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
  type Dialogs,
  type DialogVariant,
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
 * Components on connected routes (/$nodeNum/*) can safely use this hook
 * as a device will be guaranteed to exist by the time they render.
 *
 * For components that may render before a device is connected (e.g., AppSidebar),
 * use useDeviceStore directly to check if device exists first.
 *
 * @returns Device - the current device (creates one if needed for backward compat)
 */
export const useDevice = (): Device => {
  const device = useDeviceStore((s) => s.device);

  // If no device exists, initialize one (maintains backward compatibility)
  if (!device) {
    return useDeviceStore.getState().initializeDevice();
  }

  return device;
};
