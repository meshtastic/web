import type { MeshRegistry } from "@core/kmp/registry.ts";
import type { MeshSession } from "@core/kmp/session.ts";
import { createContext, type ReactNode, useContext } from "react";
import { useSignal } from "./useSignal.ts";

const MeshRegistryContext = createContext<MeshRegistry | undefined>(undefined);

export interface MeshRegistryProviderProps {
  registry: MeshRegistry;
  children: ReactNode;
}

export function MeshRegistryProvider({
  registry,
  children,
}: MeshRegistryProviderProps) {
  return (
    <MeshRegistryContext.Provider value={registry}>
      {children}
    </MeshRegistryContext.Provider>
  );
}

export function useMeshRegistry(): MeshRegistry {
  const registry = useContext(MeshRegistryContext);
  if (!registry) {
    throw new Error("useMeshRegistry must be used within MeshRegistryProvider");
  }
  return registry;
}

/** The session of the connection the app is looking at, if any. */
export function useActiveClient(): MeshSession | undefined {
  return useSignal(useMeshRegistry().active);
}
