import { useDeviceContext } from "@core/hooks/useDeviceContext.ts";
import { type Device, useDeviceStore } from "@core/stores/deviceStore/index.ts";
import {
  type MessageStore,
  useMessageStore,
} from "@core/stores/messageStore/index.ts";
import { type NodeDB, useNodeDBStore } from "@core/stores/nodeDBStore/index.ts";
import { bindStoreToDevice } from "@core/stores/utils/bindStoreToDevice.ts";

export {
  CurrentDeviceContext,
  type DeviceContext,
  useDeviceContext,
} from "@core/hooks/useDeviceContext";
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
export {
  MessageState,
  type MessageStore,
  MessageType,
  useMessageStore,
} from "@core/stores/messageStore";
export {
  autoFavoriteDMHandler,
  loggingHandler,
} from "@core/stores/messageStore/pipelineHandlers";
export type {
  OutgoingMessage,
  PipelineContext,
  PipelineHandler,
} from "@core/stores/messageStore/types";
export { type NodeDB, useNodeDBStore } from "@core/stores/nodeDBStore/index.ts";
export type { NodeErrorType } from "@core/stores/nodeDBStore/types.ts";
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
