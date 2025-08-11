import { type Device, useDeviceStore } from "@core/stores/deviceStore";
import { type NodeDB, useNodeDBStore } from "@core/stores/nodeDBStore";
import { useDeviceContext } from "@core/stores/utils/deviceContext";

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
  useMessageStore, // TODO: Bring hook into this file
} from "@core/stores/messageStore";

export { type NodeDB, useNodeDBStore } from "@core/stores/nodeDBStore";

export {
  SidebarProvider,
  useSidebar, // TODO: Bring hook into this file
} from "@core/stores/sidebarStore";

export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@core/stores/utils/deviceContext";

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
