import { create } from "@bufbuild/protobuf";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice, useDeviceContext } from "@core/stores";
import { nodeRepo } from "@db/index";
import { Protobuf } from "@meshtastic/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface IgnoreNodeOptions {
  nodeNum: number;
  isIgnored: boolean;
}

export function useIgnoreNode() {
  const { sendAdminMessage } = useDevice();
  const { deviceId } = useDeviceContext();

  const { t } = useTranslation();

  const { toast } = useToast();

  const updateIgnoredCB = useCallback(
    async ({ nodeNum, isIgnored }: IgnoreNodeOptions) => {
      // Get node from database
      const node = await nodeRepo.getNode(deviceId, nodeNum);
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

      // Update ignored status in database
      await nodeRepo.updateIgnored(deviceId, nodeNum, isIgnored);

      toast({
        title: t("toast.ignoreNode.title", {
          nodeName: node?.longName ?? "node",
          action: isIgnored
            ? t("toast.ignoreNode.action.added")
            : t("toast.ignoreNode.action.removed"),
          direction: isIgnored
            ? t("toast.ignoreNode.action.to")
            : t("toast.ignoreNode.action.from"),
        }),
      });
    },
    [sendAdminMessage, deviceId, t, toast],
  );

  return { updateIgnored: updateIgnoredCB };
}
