import { create } from "@bufbuild/protobuf";
import { useToast } from "@core/hooks/useToast.ts";
import { useDevice, useDeviceContext } from "@core/stores";
import { nodeRepo } from "@db/index";
import { Protobuf } from "@meshtastic/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
  const { sendAdminMessage } = useDevice();
  const { deviceId } = useDeviceContext();
  const { t } = useTranslation();
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    async ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      // Get node from database
      const node = await nodeRepo.getNode(deviceId, nodeNum);
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

      // Update favorite status in database
      await nodeRepo.updateFavorite(deviceId, nodeNum, isFavorite);

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
    [deviceId, sendAdminMessage, t, toast],
  );

  return { updateFavorite: updateFavoriteCB };
}
