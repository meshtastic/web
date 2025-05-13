import { useCallback } from "react";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useToast } from "@core/hooks/useToast.ts";

interface IgnoreNodeOptions {
  nodeNum: number;
  isIgnored: boolean;
}

export function useIgnoreNode() {
  const { updateIgnored, getNode } = useDevice();
  const { toast } = useToast();

  const updateIgnoredCB = useCallback(
    ({ nodeNum, isIgnored }: IgnoreNodeOptions) => {
      const node = getNode(nodeNum);
      if (!node) return;

      updateIgnored(nodeNum, isIgnored);

      toast({
        title: `${isIgnored ? "Added" : "Removed"} ${
          node?.user?.longName ?? "node"
        } ${isIgnored ? "to" : "from"} ignore list`,
      });
    },
    [updateIgnored, getNode],
  );

  return { updateIgnored: updateIgnoredCB };
}
