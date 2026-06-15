import type { TelemetryReading } from "@meshtastic/sdk";
import { useMemo } from "react";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export interface UseTelemetryResult {
  latest: TelemetryReading | undefined;
  history: TelemetryReading[];
}

export function useTelemetry(nodeNum: number): UseTelemetryResult {
  const client = useClient();
  const latestSig = useMemo(() => client.telemetry.latest(nodeNum), [client, nodeNum]);
  const historySig = useMemo(() => client.telemetry.history(nodeNum), [client, nodeNum]);
  const latest = useSignal(latestSig);
  const history = useSignal(historySig);
  return { latest, history };
}
