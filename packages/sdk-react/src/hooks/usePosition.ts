import type { Position } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignalValue } from "../adapters/useSignalValue.ts";

export function usePosition(nodeNum: number): Position | undefined {
  const client = useClient();
  return useSignalValue(client.position.list, (list) => list.find((p) => p.nodeNum === nodeNum));
}
