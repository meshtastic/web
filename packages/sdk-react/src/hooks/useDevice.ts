import type * as Protobuf from "@meshtastic/protobufs";
import type { DeviceStatusEnum } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export interface UseDeviceResult {
  status: DeviceStatusEnum;
  isConfigured: boolean;
  myNodeNum: number | undefined;
  metadata: Protobuf.Mesh.DeviceMetadata | undefined;
  reboot(seconds?: number): Promise<number>;
  shutdown(seconds?: number): Promise<number>;
}

export function useDevice(): UseDeviceResult {
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
