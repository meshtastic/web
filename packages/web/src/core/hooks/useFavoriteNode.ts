import { create } from "@bufbuild/protobuf";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice, useNodeDB } from "@core/stores";
import { Protobuf } from "@meshtastic/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
  const { sendAdminMessage } = useDevice();
  const { getNode, updateFavorite } = useNodeDB();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      const node = getNode(nodeNum);
      if (!node) {
        return;
      }

      sendAdminMessage(
        create(Protobuf.Admin.AdminMessageSchema, {
          payloadVariant: {
            case: isFavorite ? "setFavoriteNode" : "removeFavoriteNode",
            value: nodeNum,
          },
        }),
      );

      // TODO: Wait for response before changing the store
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
    [updateFavorite, sendAdminMessage, getNode, t, toast],
  );

  return { updateFavorite: updateFavoriteCB };
}
