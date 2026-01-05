import { useNodes } from "@app/data/hooks/useNodes.ts";
import { useParams } from "@tanstack/react-router";

// Promise cache to avoid creating new promises on each render
let pendingPromise: Promise<void> | null = null;

/**
 * Hook for connected routes - guaranteed to return valid nodeNum.
 * Must be used within a Suspense boundary on /:nodeNum/* routes.
 *
 * @returns { myNodeNum: number, myNode: Node | undefined }
 * @throws Promise - suspends until nodeNum is available
 *
 * @example
 * ```typescript
 * const { myNodeNum, myNode } = useMyNode();
 * // myNodeNum is guaranteed to be a valid number
 * const messages = useDirectMessages(myNodeNum, ...);
 * ```
 */
export function useMyNode() {
  const params = useParams({ strict: false });
  const nodeNum = params.nodeNum as string | undefined;

  if (!nodeNum) {
    // Throw a promise to trigger Suspense
    if (!pendingPromise) {
      pendingPromise = new Promise((resolve) => {
        setTimeout(() => {
          pendingPromise = null;
          resolve();
        }, 0);
      });
    }
    throw pendingPromise;
  }

  const myNodeNum = Number(nodeNum);
  const { nodeMap } = useNodes(myNodeNum);
  const myNode = nodeMap.get(myNodeNum);

  return {
    myNodeNum,
    myNode,
  };
}
