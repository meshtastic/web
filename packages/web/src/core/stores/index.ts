import { useDeviceContext } from "@core/hooks/useDeviceContext.ts";
import { type Device, useDeviceStore } from "@core/stores/deviceStore/index.ts";

export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@core/hooks/useDeviceContext";
export {
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
  CoordinateFormat,
  DistanceUnits,
  Language,
  MapStyle,
  MessageTab,
  NodeColumnKey,
  RasterSource,
  SplitMode,
  Theme,
  TimeFormat,
  UIState,
} from "@core/stores/uiStore/index.ts";
export { useUIStore } from "@core/stores/uiStore/index.ts";

// Define hooks to access the stores
export const useDevice = (): Device => {
  const { deviceId } = useDeviceContext();

  const device = useDeviceStore(
    (s) => s.getDevice(deviceId) ?? s.addDevice(deviceId),
  );
  return device;
};
