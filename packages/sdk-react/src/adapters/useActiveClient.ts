import type { MeshClient } from "@meshtastic/sdk";
import { useMeshRegistry } from "./useMeshRegistry.ts";
import { useSignal } from "./useSignal.ts";

export function useActiveClient(): MeshClient | undefined {
  const registry = useMeshRegistry();
  return useSignal(registry.active);
}
