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
