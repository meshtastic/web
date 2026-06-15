import type { ConnectionId, MeshClient } from "@meshtastic/sdk";
import { useMeshRegistry } from "./useMeshRegistry.ts";

export function useClientById(id: ConnectionId): MeshClient {
  const registry = useMeshRegistry();
  const client = registry.get(id);
  if (!client) {
    throw new Error(`No MeshClient registered for id ${id}`);
  }
  return client;
}
