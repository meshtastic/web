import type { MeshClient } from "../../../core/client/MeshClient.ts";

export function startHeartbeat(client: MeshClient, intervalMs: number): void {
  client.setHeartbeatInterval(intervalMs);
}

export function sendHeartbeat(client: MeshClient): Promise<number> {
  return client.heartbeat();
}
