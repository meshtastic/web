import { adminCommands } from "@core/services/adminCommands";
import { nodeRepo } from "@data/index";
import { useMyNode } from "@shared/hooks";
import { useToast } from "@shared/hooks/useToast";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
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
      await adminCommands.setFavoriteNode(nodeNum, isFavorite);
    },
    [myNodeNum, t, toast],
  );

  return { updateFavorite: updateFavoriteCB };
}
