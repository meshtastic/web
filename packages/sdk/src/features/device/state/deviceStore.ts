import type * as Protobuf from "@meshtastic/protobufs";
import { createStore } from "../../../core/signals/createStore.ts";
import { DeviceStatusEnum } from "../../../core/transport/Transport.ts";

/**
 * Writable signals for the device slice. Only the slice application layer
 * mutates these; callers consume the `.read` readonly facades exposed by
 * DeviceClient.
 */
export function createDeviceStore() {
  const status = createStore<DeviceStatusEnum>(DeviceStatusEnum.DeviceDisconnected);
  const isConfigured = createStore(false);
  const pendingSettingsChanges = createStore(false);
  const myNodeNum = createStore<number | undefined>(undefined);
  const metadata = createStore<Protobuf.Mesh.DeviceMetadata | undefined>(undefined);
  const myNodeInfo = createStore<Protobuf.Mesh.MyNodeInfo | undefined>(undefined);

  return { status, isConfigured, pendingSettingsChanges, myNodeNum, metadata, myNodeInfo };
}

export type DeviceStore = ReturnType<typeof createDeviceStore>;
