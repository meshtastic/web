import { create } from "@bufbuild/protobuf";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice, useNodeDB } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface IgnoreNodeOptions {
  nodeNum: number;
  isIgnored: boolean;
}

export function useIgnoreNode() {
  const { sendAdminMessage } = useDevice();
  const { getNode, updateIgnore } = useNodeDB();

  const { t } = useTranslation();

  const { toast } = useToast();

  const updateIgnoredCB = useCallback(
    ({ nodeNum, isIgnored }: IgnoreNodeOptions) => {
      const node = getNode(nodeNum);
      if (!node) {
        return;
      }

      sendAdminMessage(
        create(Protobuf.Admin.AdminMessageSchema, {
          payloadVariant: {
            case: isIgnored ? "setIgnoredNode" : "removeIgnoredNode",
            value: nodeNum,
          },
        }),
      );

      // TODO: Wait for response before changing the store
      updateIgnore(nodeNum, isIgnored);

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
    [sendAdminMessage, updateIgnore, getNode, t, toast],
  );

  return { updateIgnored: updateIgnoredCB };
}
