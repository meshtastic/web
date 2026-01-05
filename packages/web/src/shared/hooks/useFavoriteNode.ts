import { AdminMessageService } from "@core/services/adminMessageService";
import { useMyNode } from "@shared/hooks";
import { nodeRepo } from "@data/index";
import { useToast } from "@shared/hooks/useToast";
import { useDevice } from "@state/index.ts";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
  const device = useDevice();
  const { myNodeNum } = useMyNode();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    async ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      // Get node from database for toast message
      const node = await nodeRepo.getNode(myNodeNum, nodeNum);
      if (!node) {
        return;
      }

      // Show toast immediately for responsive feedback
      toast({
        title: t("toast.favoriteNode.title", {
          action: isFavorite
            ? t("toast.favoriteNode.action.added")
            : t("toast.favoriteNode.action.removed"),
          nodeName: node.longName ?? t("node"),
          direction: isFavorite
            ? t("toast.favoriteNode.action.to")
            : t("toast.favoriteNode.action.from"),
        }),
      });

      // Send admin message and update local database
      await AdminMessageService.setFavoriteNode(
        device,
        myNodeNum,
        nodeNum,
        isFavorite,
      );
    },
    [device, myNodeNum, t, toast],
  );

  return { updateFavorite: updateFavoriteCB };
}
