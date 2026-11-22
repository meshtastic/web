import type { ConnectionStatus } from "@core/stores/deviceStore/types.ts";
import type { ConnectionProgress } from "@core/kmp/session.ts";

export type SyncRowId = "connection" | "settings" | "channels" | "nodes";

export type SyncRowState = "done" | "active" | "pending";

export interface SyncRow {
  readonly id: SyncRowId;
  readonly state: SyncRowState;
  /** How many arrived so far, for the rows that count. */
  readonly count?: number;
}

export type SyncPhase = "connecting" | "syncing" | "ready";

export interface SyncView {
  readonly phase: SyncPhase;
  readonly rows: ReadonlyArray<SyncRow>;
}

/**
 * The sync step's checklist from the connection status and the session's
 * handshake counters. The radio never says how many nodes it will send,
 * so rows tick when the handshake completes, not at a known total.
 */
export function syncView(
  status: ConnectionStatus | undefined,
  progress: ConnectionProgress,
): SyncView {
  const ready = progress.phase === "configured" || status === "configured";
  const connecting =
    !ready &&
    progress.phase === "idle" &&
    (status === undefined ||
      status === "connecting" ||
      status === "disconnected" ||
      status === "online");
  const phase: SyncPhase = ready
    ? "ready"
    : connecting
      ? "connecting"
      : "syncing";
  const received = progress.phase === "idle" ? undefined : progress.received;

  const stateOf = (arrived: boolean): SyncRowState =>
    ready || arrived ? "done" : phase === "syncing" ? "active" : "pending";

  const settingsArrived =
    received !== undefined &&
    received.myInfo &&
    received.metadata &&
    received.config > 0;

  return {
    phase,
    rows: [
      { id: "connection", state: phase === "connecting" ? "active" : "done" },
      { id: "settings", state: stateOf(settingsArrived) },
      {
        id: "channels",
        state: ready ? "done" : stateOf(false),
        count: received?.channels ?? 0,
      },
      {
        id: "nodes",
        state: ready ? "done" : stateOf(false),
        count: received?.nodes ?? 0,
      },
    ],
  };
}
