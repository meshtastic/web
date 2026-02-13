import { Types } from "@meshtastic/core";
import { useDeviceStore } from "@state/device/store";
import { useEffect, useEffectEvent } from "react";

/**
 * Hook that calls a callback when the device disconnects, errors, or restarts.
 * Uses onDeviceStatus events for immediate detection.
 *
 * Listens for:
 * - DeviceDisconnected
 * - DeviceError
 * - DeviceRestarting
 *
 * @param onDisconnected - Callback fired when device disconnects/errors/restarts
 */
export function useDeviceDisconnectDetection(
  onDisconnected: (status: Types.DeviceStatusEnum) => void,
) {
  const device = useDeviceStore((s) => s.device);

  const handleDeviceStatus = useEffectEvent(
    (status: Types.DeviceStatusEnum) => {
      if (
        status === Types.DeviceStatusEnum.DeviceDisconnected ||
        status === Types.DeviceStatusEnum.DeviceError ||
        status === Types.DeviceStatusEnum.DeviceRestarting
      ) {
        onDisconnected(status);
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
