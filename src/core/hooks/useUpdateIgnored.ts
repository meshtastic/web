import { useCallback } from "react";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useToast } from "@core/hooks/useToast.ts";

interface UpdateIgnoredOptions {
  nodeNum: number;
  isIgnored: boolean;
}

export function useUpdateIgnored() {
  const { updateIgnored, getNode } = useDevice();
  const { toast } = useToast();

  const updateIgnoredCB = useCallback(
    ({ nodeNum, isIgnored }: UpdateIgnoredOptions) => {
      updateIgnored(nodeNum, isIgnored);

      const node = getNode(nodeNum);

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
