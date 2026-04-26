import type { ConnectionId } from "@core/stores/deviceStore/types";
import type { MeshDevice } from "@meshtastic/sdk";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (post-config)
const CONFIG_HEARTBEAT_INTERVAL_MS = 5_000; // 5s (during initial config)

const heartbeats = new Map<ConnectionId, ReturnType<typeof setInterval>>();

/**
 * Stops + clears any active heartbeat for the connection. Safe to call when
 * no heartbeat is running.
 */
export function stopHeartbeat(id: ConnectionId): void {
  const h = heartbeats.get(id);
  if (!h) return;
  clearInterval(h);
  heartbeats.delete(id);
}

/**
 * Fast-cadence heartbeat used while the device is in `configuring`. Replaced
 * by the maintenance heartbeat once the device fires onConfigComplete.
 */
export function startConfigHeartbeat(id: ConnectionId, meshDevice: MeshDevice): void {
  stopHeartbeat(id);
  const intervalId = setInterval(() => {
    meshDevice.heartbeat().catch((error) => {
      console.warn("[heartbeat] config heartbeat failed:", error);
    });
  }, CONFIG_HEARTBEAT_INTERVAL_MS);
  heartbeats.set(id, intervalId);
}

/**
 * Slow-cadence keep-alive used after configuration completes.
 */
export function startMaintenanceHeartbeat(id: ConnectionId, meshDevice: MeshDevice): void {
  stopHeartbeat(id);
  const intervalId = setInterval(() => {
    meshDevice.heartbeat().catch((error) => {
      console.warn("[heartbeat] maintenance heartbeat failed:", error);
    });
  }, HEARTBEAT_INTERVAL_MS);
  heartbeats.set(id, intervalId);
}
