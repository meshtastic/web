import { useDevice } from "@core/stores";
import { Types } from "@core/protobuf.ts";

/** True once the active node is connected and configured. */
export function useDeviceConnected(): boolean {
  const { status } = useDevice();
  return status === Types.DeviceStatusEnum.DeviceConfigured;
}
