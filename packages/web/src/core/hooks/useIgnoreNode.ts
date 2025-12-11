import { useToast } from "@core/hooks/useToast.ts";
import { AdminMessageService } from "@core/services/adminMessageService";
import { useDevice, useDeviceContext } from "@core/stores";
import { nodeRepo } from "@db/index";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface IgnoreNodeOptions {
  nodeNum: number;
  isIgnored: boolean;
}

export function useIgnoreNode() {
  const device = useDevice();
  const { deviceId } = useDeviceContext();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateIgnoredCB = useCallback(
    async ({ nodeNum, isIgnored }: IgnoreNodeOptions) => {
      // Get node from database for toast message
      const node = await nodeRepo.getNode(deviceId, nodeNum);
      if (!node) {
        return;
      }

      // Send admin message and update local database
      await AdminMessageService.setIgnoredNode(
        device,
        deviceId,
        nodeNum,
        isIgnored,
      );

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
    [device, deviceId, t, toast],
  );

  return { updateIgnored: updateIgnoredCB };
}
