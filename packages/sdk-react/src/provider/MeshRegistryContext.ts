import type { MeshRegistry } from "@meshtastic/sdk";
import { createContext } from "react";

export const MeshRegistryContext = createContext<MeshRegistry | undefined>(undefined);
