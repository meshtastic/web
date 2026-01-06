import { adminCommands } from "@core/services/adminCommands";
import { nodeRepo } from "@data/index";
import { useMyNode } from "@shared/hooks";
import { useToast } from "@shared/hooks/useToast";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface IgnoreNodeOptions {
  nodeNum: number;
  isIgnored: boolean;
}

export function useIgnoreNode() {
  const { myNodeNum } = useMyNode();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateIgnoredCB = useCallback(
    async ({ nodeNum, isIgnored }: IgnoreNodeOptions) => {
      // Get node from database for toast message
      const node = await nodeRepo.getNode(myNodeNum, nodeNum);
      if (!node) {
        return;
      }

      // Show toast immediately for responsive feedback
      toast({
        title: t("toast.ignoreNode.title", {
          nodeName: node.longName ?? "node",
          action: isIgnored
            ? t("toast.ignoreNode.action.added")
            : t("toast.ignoreNode.action.removed"),
          direction: isIgnored
            ? t("toast.ignoreNode.action.to")
            : t("toast.ignoreNode.action.from"),
        }),
      });

      // Send admin message and update local database
      await adminCommands.setIgnoredNode(nodeNum, isIgnored);
    },
    [myNodeNum, t, toast],
  );

  return { updateIgnored: updateIgnoredCB };
}
