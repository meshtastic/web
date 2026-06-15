import { DeviceStatusEnum } from "@meshtastic/sdk";
import { useCallback } from "react";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export interface UseConnectionResult {
  status: DeviceStatusEnum;
  isConnected: boolean;
  isConnecting: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export function useConnection(): UseConnectionResult {
  const client = useClient();
  const status = useSignal(client.device.status);
  const connect = useCallback(() => client.connect(), [client]);
  const disconnect = useCallback(() => client.disconnect(), [client]);

  return {
    status,
    isConnected:
      status === DeviceStatusEnum.DeviceConnected ||
      status === DeviceStatusEnum.DeviceConfiguring ||
      status === DeviceStatusEnum.DeviceConfigured,
    isConnecting: status === DeviceStatusEnum.DeviceConnecting,
    connect,
    disconnect,
  };
}
