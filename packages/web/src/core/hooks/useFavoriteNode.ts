import { useToast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
  const { updateFavorite, getNode } = useDevice();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      const node = getNode(nodeNum);
      if (!node) {
        return;
      }

      updateFavorite(nodeNum, isFavorite);

      toast({
        title: t("toast.favoriteNode.title", {
          action: isFavorite
            ? t("toast.favoriteNode.action.added")
            : t("toast.favoriteNode.action.removed"),
          nodeName: node?.user?.longName ?? t("node"),
          direction: isFavorite
            ? t("toast.favoriteNode.action.to")
            : t("toast.favoriteNode.action.from"),
        }),
      });
    },
    [updateFavorite, getNode, t, toast],
  );

  return { updateFavorite: updateFavoriteCB };
}
