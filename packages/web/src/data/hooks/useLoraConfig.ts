import type { Protobuf } from "@meshtastic/core";
import { useDevice } from "@state/index.ts";

/**
 * Hook to get the LoRa config for a device from the device store.
 * Returns the config directly from the most up-to-date source.
 */
export function useLoraConfig(
  _deviceId: number | undefined,
): Protobuf.Config.Config_LoRaConfig | undefined {
  const device = useDevice();
  return device?.config?.lora ?? undefined;
}
