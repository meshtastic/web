import type { Result } from "better-result";
import { useCallback } from "react";
import { useClient } from "../adapters/useClient.ts";

export function useIgnoreNode() {
  const client = useClient();
  const ignore = useCallback(
    (nodeNum: number): Promise<Result<number, Error>> =>
      client.nodes.ignore(nodeNum),
    [client],
  );
  const unignore = useCallback(
    (nodeNum: number): Promise<Result<number, Error>> =>
      client.nodes.unignore(nodeNum),
    [client],
  );
  return { ignore, unignore };
}
