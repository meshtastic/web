import type { ModuleConfig, RadioConfig } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export function useConfig(): RadioConfig {
  const client = useClient();
  return useSignal(client.config.radio);
}

export function useModuleConfig(): ModuleConfig {
  const client = useClient();
  return useSignal(client.config.modules);
}

/**
 * `true` when the connected device's LoRa region is UNSET — the canonical
 * "this device was just flashed and hasn't been provisioned" cue. See
 * `ConfigClient.isRegionUnset` for semantics + reference to the equivalent
 * Meshtastic-Android flow.
 */
export function useIsRegionUnset(): boolean {
  const client = useClient();
  return useSignal(client.config.isRegionUnset);
}
