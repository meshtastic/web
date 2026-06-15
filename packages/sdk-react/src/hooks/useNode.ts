import type { Node } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignalValue } from "../adapters/useSignalValue.ts";

export function useNode(nodeNum: number): Node | undefined {
  const client = useClient();
  return useSignalValue(client.nodes.list, (list) => list.find((n) => n.num === nodeNum));
}
