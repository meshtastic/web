import type { MeshClient } from "@meshtastic/sdk";
import type { ReactNode } from "react";
import { MeshContext } from "./MeshContext.ts";

export interface MeshProviderProps {
  client: MeshClient;
  children: ReactNode;
}

export function MeshProvider({ client, children }: MeshProviderProps) {
  return <MeshContext.Provider value={client}>{children}</MeshContext.Provider>;
}
