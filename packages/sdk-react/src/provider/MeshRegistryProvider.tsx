import type { MeshRegistry } from "@meshtastic/sdk";
import type { ReactNode } from "react";
import { MeshRegistryContext } from "./MeshRegistryContext.ts";

export interface MeshRegistryProviderProps {
  registry: MeshRegistry;
  children: ReactNode;
}

/**
 * Makes a MeshRegistry available to descendant hooks. Use when the app holds
 * more than one connected device at a time. For single-client apps, prefer
 * `<MeshProvider client={...}>`.
 */
export function MeshRegistryProvider({ registry, children }: MeshRegistryProviderProps) {
  return <MeshRegistryContext.Provider value={registry}>{children}</MeshRegistryContext.Provider>;
}
