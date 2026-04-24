import type { MeshRegistry } from "@meshtastic/sdk";
import { useContext } from "react";
import { MeshRegistryContext } from "../provider/MeshRegistryContext.ts";

export function useMeshRegistry(): MeshRegistry {
  const registry = useContext(MeshRegistryContext);
  if (!registry) {
    throw new Error("useMeshRegistry must be called inside a <MeshRegistryProvider>.");
  }
  return registry;
}

export function useOptionalMeshRegistry(): MeshRegistry | undefined {
  return useContext(MeshRegistryContext);
}
