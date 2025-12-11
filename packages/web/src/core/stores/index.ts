import { useDeviceContext } from "@core/hooks/useDeviceContext.ts";
import { type Device, useDeviceStore } from "@core/stores/deviceStore/index.ts";

export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@core/hooks/useDeviceContext";
export {
  clearConnectionCache,
  type Device,
  useDeviceStore,
} from "@core/stores/deviceStore/index.ts";
export type {
  Page,
  ValidConfigType,
  ValidModuleConfigType,
  WaypointWithMetadata,
} from "@core/stores/deviceStore/types.ts";
export type {
  AppState,
  CoordinateFormat,
  DistanceUnits,
  Language,
  MapStyle,
  NodeColumnKey,
  PreferencesState,
  RasterSource,
  Theme,
  TimeFormat,
  UIState,
} from "@core/stores/uiStore/index.ts";
export {
  useAppStore,
  usePreferencesStore,
  useUIStore,
} from "@core/stores/uiStore/index.ts";

// Re-export idb-keyval functions for clearing allstores, expand this if we add more local storage types
export { clear as clearAllStores } from "idb-keyval";

// Define hooks to access the stores
export const useDevice = (): Device => {
  const { deviceId } = useDeviceContext();

  const device = useDeviceStore(
    (s) => s.getDevice(deviceId) ?? s.addDevice(deviceId),
  );
  return device;
};
