import { useDeviceContext } from "@core/hooks/useDeviceContext.ts";
import { type Device, useDeviceStore } from "@core/stores/deviceStore/index.ts";

export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@core/hooks/useDeviceContext";
export { useAppStore } from "@core/stores/appStore/index.ts";
export { type Device, useDeviceStore } from "@core/stores/deviceStore/index.ts";
export {
  useActiveConnection,
  useActiveConnectionId,
  useAddSavedConnection,
  useConnectionError,
  useConnectionForDevice,
  useConnectionStatus,
  useDefaultConnection,
  useDeviceForConnection,
  useFirstSavedConnection,
  useIsConnected,
  useIsConnecting,
  useRemoveSavedConnection,
  useSavedConnections,
  useUpdateSavedConnection,
} from "@core/stores/deviceStore/selectors.ts";
export type {
  Page,
  ValidConfigType,
  ValidModuleConfigType,
  WaypointWithMetadata,
} from "@core/stores/deviceStore/types.ts";
export { MessageState, MessageType } from "@core/stores/messageStore";
export {
  SidebarProvider,
  useSidebar, // TODO: Bring hook into this file
} from "@core/stores/sidebarStore/index.tsx";

// Re-export idb-keyval functions for clearing all stores, expand this if we add more local storage types
export { clear as clearAllStores } from "idb-keyval";

export const useDevice = (): Device => {
  const { deviceId } = useDeviceContext();

  const device = useDeviceStore((s) => s.getDevice(deviceId) ?? s.addDevice(deviceId));
  return device;
};
