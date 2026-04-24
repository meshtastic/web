import type * as Protobuf from "@meshtastic/protobufs";
import type { DeviceStatusEnum } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export interface UseMeshDeviceResult {
  status: DeviceStatusEnum;
  isConfigured: boolean;
  myNodeNum: number | undefined;
  metadata: Protobuf.Mesh.DeviceMetadata | undefined;
  reboot(seconds?: number): Promise<number>;
  shutdown(seconds?: number): Promise<number>;
}

/**
 * Exposes the device slice of the current MeshClient: status, metadata, and
 * reboot/shutdown commands. Named `useMeshDevice` (not `useDevice`) so it does
 * not collide with consumer hooks of the same name (e.g. the legacy one in
 * `packages/web`).
 */
export function useMeshDevice(): UseMeshDeviceResult {
  const client = useClient();
  const status = useSignal(client.device.status);
  const isConfigured = useSignal(client.device.isConfigured);
  const myNodeNum = useSignal(client.device.myNodeNum);
  const metadata = useSignal(client.device.metadata);

  return {
    status,
    isConfigured,
    myNodeNum,
    metadata,
    reboot: client.device.reboot.bind(client.device),
    shutdown: client.device.shutdown.bind(client.device),
  };
}
