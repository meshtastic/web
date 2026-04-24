import type { ResultType } from "better-result";
import { useCallback } from "react";
import { useClient } from "../adapters/useClient.ts";

export function useFavoriteNode() {
  const client = useClient();
  const favorite = useCallback(
    (nodeNum: number): Promise<ResultType<number, Error>> => client.nodes.favorite(nodeNum),
    [client],
  );
  const unfavorite = useCallback(
    (nodeNum: number): Promise<ResultType<number, Error>> => client.nodes.unfavorite(nodeNum),
    [client],
  );
  return { favorite, unfavorite };
}
