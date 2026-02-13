import { Types } from "@meshtastic/core";
import { useDeviceStore } from "@state/device/store";
import { useEffect, useEffectEvent } from "react";

/**
 * Hook that calls a callback when the device reconnects.
 * Uses onDeviceStatus events for immediate detection.
 *
 * Listens for:
 * - DeviceConnected
 * - DeviceConfigured
 *
 * @param onReconnected - Callback fired when device status becomes Connected or Configured
 */
export function useDeviceReconnectionDetection(onReconnected: () => void) {
  const device = useDeviceStore((s) => s.device);

  const handleDeviceStatus = useEffectEvent(
    (status: Types.DeviceStatusEnum) => {
      if (
        status === Types.DeviceStatusEnum.DeviceConnected ||
        status === Types.DeviceStatusEnum.DeviceConfigured
      ) {
        onReconnected();
      }
    },
  );

  useEffect(() => {
    const connection = device?.connection;
    if (!connection) return;

    const unsub =
      connection.events.onDeviceStatus.subscribe(handleDeviceStatus);
    return unsub;
  }, [device?.connection]);
}
