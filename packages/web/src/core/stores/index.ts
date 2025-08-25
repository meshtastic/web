import { useDeviceContext } from "@app/core/stores/utils/useDeviceContext";
import { type Device, useDeviceStore } from "@core/stores/deviceStore";
import { type MessageStore, useMessageStore } from "@core/stores/messageStore";
import { type NodeDB, useNodeDBStore } from "@core/stores/nodeDBStore";

export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@app/core/stores/utils/useDeviceContext";
export { useAppStore } from "@core/stores/appStore";
export {
  type Device,
  type Page,
  useDeviceStore,
  type ValidConfigType,
  type ValidModuleConfigType,
} from "@core/stores/deviceStore";
export {
  MessageState,
  type MessageStore,
  MessageType,
  useMessageStore,
} from "@core/stores/messageStore";
export { type NodeDB, useNodeDBStore } from "@core/stores/nodeDBStore";
export type { NodeErrorType } from "@core/stores/nodeDBStore/types";
export {
  SidebarProvider,
  useSidebar, // TODO: Bring hook into this file
} from "@core/stores/sidebarStore";
export { useNewNodeNum } from "@core/stores/utils/useNewNodeNum";

// Define hooks to access the stores
export const useNodeDB = (): NodeDB => {
  const { deviceId } = useDeviceContext();
  const nodeDB = useNodeDBStore(
    (s) => s.getNodeDB(deviceId) ?? s.addNodeDB(deviceId),
  );
  return nodeDB;
};
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
