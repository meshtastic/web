import { useToast } from "@core/hooks/useToast.ts";
import { useNodeDB } from "@core/stores";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
  const meshClient = useActiveClient();
  // Mirror to the legacy nodeDB until the favorite/ignore-flag projection on
  // the SDK Node entity drives the UI directly.
  const { updateFavorite } = useNodeDB();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      if (!meshClient) return;
      const node = meshClient.nodes.byNum(nodeNum);
      if (!node) return;

      void (isFavorite ? meshClient.nodes.favorite(nodeNum) : meshClient.nodes.unfavorite(nodeNum));

      // TODO: drive store mutation off the admin-message ack instead of optimistic.
      updateFavorite(nodeNum, isFavorite);

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
    [meshClient, updateFavorite, t, toast],
  );

  return { updateFavorite: updateFavoriteCB };
}
