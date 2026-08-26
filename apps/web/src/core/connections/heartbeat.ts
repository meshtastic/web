import type { ConnectionId } from "@core/stores/deviceStore/types";
import { useDeviceStore } from "@core/stores/deviceStore";
import type { MeshDevice } from "@meshtastic/sdk";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (post-config)
const CONFIG_HEARTBEAT_INTERVAL_MS = 5_000; // 5s (during initial config)

const MAX_CONSECUTIVE_FAILURES = 3;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

const heartbeats = new Map<ConnectionId, ReturnType<typeof setInterval>>();
const failures = new Map<ConnectionId, number>();
const retryTimers = new Map<ConnectionId, ReturnType<typeof setTimeout>>();
const meshDevices = new Map<ConnectionId, MeshDevice>();
const generations = new Map<ConnectionId, number>();

function backoffDelay(attempt: number): number {
  // Full jitter: random(0, min(cap, base * 2^(attempt-1))) — AWS best practice
  const capped = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (attempt - 1));
  return Math.random() * capped;
}

/**
 * Stops + clears any active heartbeat for the connection. Safe to call when
 * no heartbeat is running.
 */
export function stopHeartbeat(id: ConnectionId): void {
  const h = heartbeats.get(id);
  if (h) {
    clearInterval(h);
    heartbeats.delete(id);
  }
  const rt = retryTimers.get(id);
  if (rt) {
    clearTimeout(rt);
    retryTimers.delete(id);
  }
  failures.delete(id);
  meshDevices.delete(id);
  // Bump generation so any in-flight heartbeat that settles late is ignored
  generations.set(id, (generations.get(id) ?? 0) + 1);
}

function handleHeartbeatResult(
  id: ConnectionId,
  gen: number,
  success: boolean,
  error?: unknown,
  expectedStatus: "configuring" | "configured" = "configured",
): void {
  // Ignore stale callbacks from a previous start/stop generation
  if ((generations.get(id) ?? 0) !== gen) return;

  if (success) {
    const prevFailures = failures.get(id) ?? 0;
    failures.set(id, 0);
    // Clear warning if we recovered
    if (prevFailures >= MAX_CONSECUTIVE_FAILURES) {
      const conn = useDeviceStore
        .getState()
        .savedConnections.find((c) => c.id === id);
      if (conn?.status === "warning") {
        useDeviceStore.getState().updateSavedConnection(id, {
          status: expectedStatus,
          error: undefined,
        });
      }
    }
    return;
  }

  const count = (failures.get(id) ?? 0) + 1;
  failures.set(id, count);
  console.warn(
    `[heartbeat] ${expectedStatus} heartbeat failed (${count}/${MAX_CONSECUTIVE_FAILURES}):`,
    error,
  );

  if (count >= MAX_CONSECUTIVE_FAILURES) {
    useDeviceStore.getState().updateSavedConnection(id, {
      status: "warning",
      error: `Heartbeat failed ${count} times — device may be unreachable`,
    });
    return;
  }

  // Schedule a one-off retry with backoff, not waiting for next interval
  const delay = backoffDelay(count);
  const existing = retryTimers.get(id);
  if (existing) clearTimeout(existing);
  const md = meshDevices.get(id);
  if (!md) return;
  const timer = setTimeout(() => {
    retryTimers.delete(id);
    // Re-check generation before firing the retry
    if ((generations.get(id) ?? 0) !== gen) return;
    md.heartbeat()
      .then(() =>
        handleHeartbeatResult(id, gen, true, undefined, expectedStatus),
      )
      .catch((e) => handleHeartbeatResult(id, gen, false, e, expectedStatus));
  }, delay);
  retryTimers.set(id, timer);
}

/**
 * Fast-cadence heartbeat used while the device is in `configuring`. Replaced
 * by the maintenance heartbeat once the device fires onConfigComplete.
 */
export function startConfigHeartbeat(
  id: ConnectionId,
  meshDevice: MeshDevice,
): void {
  stopHeartbeat(id);
  failures.set(id, 0);
  meshDevices.set(id, meshDevice);
  const gen = (generations.get(id) ?? 0) + 1;
  generations.set(id, gen);
  const intervalId = setInterval(() => {
    meshDevice
      .heartbeat()
      .then(() =>
        handleHeartbeatResult(id, gen, true, undefined, "configuring"),
      )
      .catch((error) =>
        handleHeartbeatResult(id, gen, false, error, "configuring"),
      );
  }, CONFIG_HEARTBEAT_INTERVAL_MS);
  heartbeats.set(id, intervalId);
}

/**
 * Slow-cadence keep-alive used after configuration completes.
 */
export function startMaintenanceHeartbeat(
  id: ConnectionId,
  meshDevice: MeshDevice,
): void {
  stopHeartbeat(id);
  failures.set(id, 0);
  meshDevices.set(id, meshDevice);
  const gen = (generations.get(id) ?? 0) + 1;
  generations.set(id, gen);
  const intervalId = setInterval(() => {
    meshDevice
      .heartbeat()
      .then(() => handleHeartbeatResult(id, gen, true, undefined, "configured"))
      .catch((error) =>
        handleHeartbeatResult(id, gen, false, error, "configured"),
      );
  }, HEARTBEAT_INTERVAL_MS);
  heartbeats.set(id, intervalId);
}
