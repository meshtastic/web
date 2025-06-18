import { useCallback } from "react";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
  const { updateFavorite, getNode } = useDevice();
  const { t } = useTranslation("ui");
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      const node = getNode(nodeNum);
      if (!node) return;

      updateFavorite(nodeNum, isFavorite);

      toast({
        title: t("toast.favoriteNode", {
          action: isFavorite ? t("button.added") : t("button.removed"),
          nodeName: node?.user?.longName ?? t("node"),
          location: isFavorite ? t("to") : t("from"),
        }),
      });
    },
    [updateFavorite, getNode],
  );

  return { updateFavorite: updateFavoriteCB };
}
