import { useDevice } from "@core/stores";
import { Types } from "@meshtastic/sdk";

/** True once the active node is connected and configured. */
export function useDeviceConnected(): boolean {
  const { connection, status } = useDevice();
  return (
    connection !== undefined &&
    status === Types.DeviceStatusEnum.DeviceConfigured
  );
}
