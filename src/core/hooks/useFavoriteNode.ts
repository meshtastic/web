import { useCallback } from "react";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useToast } from "@core/hooks/useToast.ts";

interface FavoriteNodeOptions {
  nodeNum: number;
  isFavorite: boolean;
}

export function useFavoriteNode() {
  const { updateFavorite, getNode } = useDevice();
  const { toast } = useToast();

  const updateFavoriteCB = useCallback(
    ({ nodeNum, isFavorite }: FavoriteNodeOptions) => {
      const node = getNode(nodeNum);
      if (!node) return;

      updateFavorite(nodeNum, isFavorite);

      toast({
        title: `${isFavorite ? "Added" : "Removed"} ${
          node?.user?.longName ?? "node"
        } ${isFavorite ? "to" : "from"} favorites`,
      });
    },
    [updateFavorite, getNode],
  );

  return { updateFavorite: updateFavoriteCB };
}
