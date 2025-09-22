import { useDeviceContext } from "@core/hooks/useDeviceContext";
import { type Device, useDeviceStore } from "@core/stores/deviceStore";
import { type MessageStore, useMessageStore } from "@core/stores/messageStore";
import { type NodeDB, useNodeDBStore } from "@core/stores/nodeDBStore";
import { bindStoreToDevice } from "@core/stores/utils/bindStoreToDevice";

export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@core/hooks/useDeviceContext";
export { useAppStore } from "@core/stores/appStore";
export {
  type Device,
  type Page,
  useDeviceStore,
  type ValidConfigType,
  type ValidModuleConfigType,
  type WaypointWithMetadata,
} from "@core/stores/deviceStore";
export { type ActionItem, useHeaderStore } from "@core/stores/headerStore";
export {
  MessageState,
  type MessageStore,
  MessageType,
  useMessageStore,
} from "@core/stores/messageStore";
export { type NodeDB, useNodeDBStore } from "@core/stores/nodeDBStore";
export type { NodeErrorType } from "@core/stores/nodeDBStore/types";

// Re-export idb-keyval functions for clearing all stores, expand this if we add more local storage types
export { clear as clearAllStores } from "idb-keyval";

// Define hooks to access the stores
export const useNodeDB = bindStoreToDevice(
  useNodeDBStore,
  (s, deviceId): NodeDB => s.getNodeDB(deviceId) ?? s.addNodeDB(deviceId),
);

export const useDevice = (): Device => {
  const { deviceId } = useDeviceContext();

  const device = useDeviceStore(
    (s) => s.getDevice(deviceId) ?? s.addDevice(deviceId),
  );
  return device;
};

export const useMessages = (): MessageStore => {
  const { deviceId } = useDeviceContext();

  const device = useMessageStore(
    (s) => s.getMessageStore(deviceId) ?? s.addMessageStore(deviceId),
  );
  return device;
};
