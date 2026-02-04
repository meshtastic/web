import { useNodes } from "@app/data/hooks/useNodes.ts";
import { useParams } from "@tanstack/react-router";

/**
 * Hook for connected routes - returns nodeNum from URL params.
 * Should only be used on /:nodeNum/* routes where nodeNum is guaranteed.
 *
 * @returns { myNodeNum: number, myNode: Node | undefined }
 * @throws Error if nodeNum is not in URL params (indicates incorrect usage)
 *
 * @example
 * ```typescript
 * const { myNodeNum, myNode } = useMyNode();
 * // myNodeNum is guaranteed to be a valid number on /$nodeNum/* routes
 * const messages = useDirectMessages(myNodeNum, ...);
 * ```
 */
export function useMyNode() {
  const params = useParams({ strict: false });
  const nodeNum = params.nodeNum as string | undefined;

  if (!nodeNum) {
    throw new Error(
      "useMyNode must be used on a route with :nodeNum param (e.g., /$nodeNum/settings)",
    );
  }

  const myNodeNum = Number(nodeNum);
  const { nodeMap } = useNodes(myNodeNum);
  const myNode = nodeMap.get(myNodeNum);

  return {
    myNodeNum,
    myNode,
  };
}
