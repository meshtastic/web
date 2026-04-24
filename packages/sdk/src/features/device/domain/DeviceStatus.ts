import { DeviceStatusEnum } from "../../../core/transport/Transport.ts";

export { DeviceStatusEnum };

export function isConnected(status: DeviceStatusEnum): boolean {
  return (
    status === DeviceStatusEnum.DeviceConnected ||
    status === DeviceStatusEnum.DeviceConfiguring ||
    status === DeviceStatusEnum.DeviceConfigured
  );
}

export function isConfigured(status: DeviceStatusEnum): boolean {
  return status === DeviceStatusEnum.DeviceConfigured;
}
