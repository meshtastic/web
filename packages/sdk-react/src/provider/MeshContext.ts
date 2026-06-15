import type { MeshClient } from "@meshtastic/sdk";
import { createContext } from "react";

export const MeshContext = createContext<MeshClient | undefined>(undefined);
