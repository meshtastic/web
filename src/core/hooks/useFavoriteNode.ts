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
      updateFavorite(nodeNum, isFavorite);

      const node = getNode(nodeNum);

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
