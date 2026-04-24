import type { Node } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export function useNodes(): ReadonlyArray<Node> {
  const client = useClient();
  return useSignal(client.nodes.list);
}
