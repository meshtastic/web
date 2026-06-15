import { useToast } from "@core/hooks/useToast.ts";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface IgnoreNodeOptions {
  nodeNum: number;
  isIgnored: boolean;
}

/**
 * Toggles the ignored flag on a node. Drives the SDK NodesClient which
 * sends the matching admin message and flips the local flag on success.
 */
export function useIgnoreNode() {
  const meshClient = useActiveClient();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateIgnoredCB = useCallback(
    ({ nodeNum, isIgnored }: IgnoreNodeOptions) => {
      if (!meshClient) return;
      const node = meshClient.nodes.byNum(nodeNum);
      if (!node) return;

      void (isIgnored ? meshClient.nodes.ignore(nodeNum) : meshClient.nodes.unignore(nodeNum));

      toast({
        title: t("toast.ignoreNode.title", {
          nodeName: node.user?.longName ?? "node",
          action: isIgnored
            ? t("toast.ignoreNode.action.added")
            : t("toast.ignoreNode.action.removed"),
          direction: isIgnored
            ? t("toast.ignoreNode.action.to")
            : t("toast.ignoreNode.action.from"),
        }),
      });
    },
    [meshClient, t, toast],
  );

  return { updateIgnored: updateIgnoredCB };
}
