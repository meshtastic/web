import type { ReadonlySignal, TelemetryReading } from "@meshtastic/sdk";
import { useActiveClient, useSignal } from "@meshtastic/sdk-react";
import { useMemo } from "react";

const EMPTY_HISTORY: TelemetryReading[] = [];
const EMPTY_HISTORY_SIGNAL: ReadonlySignal<TelemetryReading[]> = {
  value: EMPTY_HISTORY,
  peek: () => EMPTY_HISTORY,
  subscribe: () => () => {},
};

/**
 * Telemetry readings the active client holds for a node, every variant.
 *
 * `client.telemetry.latest(nodeNum)` is the most recent reading of any
 * variant, so callers that want the latest per variant derive it from this
 * history (see `latestReadingPerKind`). Returns an empty list when no client
 * is active, instead of throwing like `useTelemetry`.
 */
export function useNodeTelemetryHistory(
  nodeNum: number,
): readonly TelemetryReading[] {
  const client = useActiveClient();
  const historySignal = useMemo(
    () => client?.telemetry.history(nodeNum) ?? EMPTY_HISTORY_SIGNAL,
    [client, nodeNum],
  );
  return useSignal(historySignal);
}
