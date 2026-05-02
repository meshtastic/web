import type { ConnectionProgress, ReadonlySignal } from "@meshtastic/sdk";
import { useActiveClient } from "../adapters/useActiveClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

const IDLE_PROGRESS: ConnectionProgress = { phase: "idle" };
const IDLE_SIGNAL: ReadonlySignal<ConnectionProgress> = {
  value: IDLE_PROGRESS,
  peek: () => IDLE_PROGRESS,
  subscribe: () => () => {},
};

/**
 * Live view of `MeshClient.progress` for the active registry client.
 * Returns `{ phase: "idle" }` when no client is active or before
 * `configure()` runs; flips through `configuring` (with per-section
 * counters) and lands on `configured` once the device finishes streaming
 * its config bundle. UI surfaces use this to drive a connecting overlay
 * with live "received N nodes / X channels" feedback.
 */
export function useConnectionProgress(): ConnectionProgress {
  const client = useActiveClient();
  return useSignal(client?.progress ?? IDLE_SIGNAL);
}
