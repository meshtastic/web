import type { Protobuf } from "@meshtastic/core";
import { useEffectiveConfig } from "./usePendingChanges.ts";

/**
 * Hook to get the LoRa config for a device from the database.
 * Returns the merged config (base + pending changes).
 */
export function useLoraConfig(
  deviceId: number | undefined,
): Protobuf.Config.Config_LoRaConfig | undefined {
  const { config, isLoading } = useEffectiveConfig(deviceId, "lora");

  if (isLoading || !config) {
    return undefined;
  }

  return config as Protobuf.Config.Config_LoRaConfig;
}
