import { useToast } from "@core/hooks/useToast.ts";
import { AdminMessageService } from "@core/services/adminMessageService";
import { useDevice, useDeviceContext } from "@core/stores";
import { nodeRepo } from "@data/index";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
  const device = useDevice();
  const { deviceId } = useDeviceContext();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    async ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      // Get node from database for toast message
      const node = await nodeRepo.getNode(deviceId, nodeNum);
      if (!node) {
        return;
      }

      // Send admin message and update local database
      await AdminMessageService.setFavoriteNode(
        device,
        deviceId,
        nodeNum,
        isFavorite,
      );

      toast({
        title: t("toast.favoriteNode.title", {
          action: isFavorite
            ? t("toast.favoriteNode.action.added")
            : t("toast.favoriteNode.action.removed"),
          nodeName: node?.longName ?? t("node"),
          direction: isFavorite
            ? t("toast.favoriteNode.action.to")
            : t("toast.favoriteNode.action.from"),
        }),
      });
    },
    [device, deviceId, t, toast],
  );

  return { updateFavorite: updateFavoriteCB };
}
