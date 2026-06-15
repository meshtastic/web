import type { NodeError } from "@meshtastic/sdk";
import { useActiveClient } from "../adapters/useActiveClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

const EMPTY: ReadonlyArray<NodeError> = [];
const EMPTY_SIGNAL = {
  value: EMPTY,
  peek: () => EMPTY,
  subscribe: () => () => {},
};

/**
 * Returns the current per-node error array from the active client. Empty
 * when no client is active or no errors have been recorded.
 */
export function useNodeErrors(): ReadonlyArray<NodeError> {
  const client = useActiveClient();
  return useSignal(client?.nodes.errors ?? EMPTY_SIGNAL);
}

export function useNodeError(nodeNum: number): NodeError | undefined {
  const errors = useNodeErrors();
  return errors.find((e) => e.node === nodeNum);
}

export function useHasNodeError(nodeNum: number): boolean {
  return useNodeError(nodeNum) !== undefined;
}
