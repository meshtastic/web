import { AdminMessageService } from "@core/services/adminMessageService";
import { DB_EVENTS, dbEvents } from "@data/events";
import { nodeRepo } from "@data/index";
import { useToast } from "@shared/hooks/useToast";
import { useDevice, useDeviceContext } from "@state/index.ts";
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
      await AdminMessageService.setIgnoredNode(
        device,
        deviceId,
        nodeNum,
        isIgnored,
      );

      // Emit event to trigger UI refresh
      dbEvents.emit(DB_EVENTS.NODE_UPDATED);
    },
    [device, deviceId, t, toast],
  );

  return { updateIgnored: updateIgnoredCB };
}
