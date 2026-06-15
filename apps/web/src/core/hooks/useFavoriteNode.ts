import { useToast } from "@core/hooks/useToast.ts";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

/**
 * Toggles the favorite flag on a node. Drives the SDK NodesClient which
 * sends the matching admin message and flips the local flag on success.
 */
export function useFavoriteNode() {
  const meshClient = useActiveClient();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      if (!meshClient) return;
      const node = meshClient.nodes.byNum(nodeNum);
      if (!node) return;

      void (isFavorite ? meshClient.nodes.favorite(nodeNum) : meshClient.nodes.unfavorite(nodeNum));

      toast({
        title: t("toast.favoriteNode.title", {
          action: isFavorite
            ? t("toast.favoriteNode.action.added")
            : t("toast.favoriteNode.action.removed"),
          nodeName: node.user?.longName ?? t("node"),
          direction: isFavorite
            ? t("toast.favoriteNode.action.to")
            : t("toast.favoriteNode.action.from"),
        }),
      });
    },
    [meshClient, t, toast],
  );

  return { updateFavorite: updateFavoriteCB };
}
