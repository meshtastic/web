import type { MeshClient } from "@meshtastic/sdk";
import { useContext } from "react";
import { MeshContext } from "../provider/MeshContext.ts";

export function useClient(): MeshClient {
  const client = useContext(MeshContext);
  if (!client) {
    throw new Error(
      "useClient must be called inside a <MeshProvider>. Did you forget to wrap your component tree?",
    );
  }
  return client;
}
