import type { TraceRoute } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignalValue } from "../adapters/useSignalValue.ts";

export function useTraceroute(destination: number): TraceRoute | undefined {
  const client = useClient();
  return useSignalValue(client.traceroute.list, (list) =>
    list.find((t) => t.destination === destination),
  );
}
