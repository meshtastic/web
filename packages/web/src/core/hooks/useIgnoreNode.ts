import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface IgnoreNodeOptions {
  nodeNum: number;
  isIgnored: boolean;
}

export function useIgnoreNode() {
  const { updateIgnored, getNode } = useDevice();
  const { t } = useTranslation();

  const { toast } = useToast();

  const updateIgnoredCB = useCallback(
    ({ nodeNum, isIgnored }: IgnoreNodeOptions) => {
      const node = getNode(nodeNum);
      if (!node) {
        return;
      }

      updateIgnored(nodeNum, isIgnored);

      toast({
        title: t("toast.ignoreNode.title", {
          nodeName: node?.user?.longName ?? "node",
          action: isIgnored
            ? t("toast.ignoreNode.action.added")
            : t("toast.ignoreNode.action.removed"),
          direction: isIgnored
            ? t("toast.ignoreNode.action.to")
            : t("toast.ignoreNode.action.from"),
        }),
      });
    },
    [updateIgnored, getNode, t, toast],
  );

  return { updateIgnored: updateIgnoredCB };
}
