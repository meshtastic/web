import useLocalStorage from "@core/hooks/useLocalStorage.ts";
import { useCallback } from "react";

export function usePinnedItems({ storageName }: { storageName: string }) {
  const [pinnedItems, setPinnedItems] = useLocalStorage<string[]>(
    storageName,
    [],
  );

  const togglePinnedItem = useCallback(
    (label: string) => {
      setPinnedItems((prev) =>
        prev.includes(label)
          ? prev.filter((g) => g !== label)
          : [...prev, label],
      );
    },
    [setPinnedItems],
  );

  return {
    pinnedItems,
    togglePinnedItem,
  };
}
