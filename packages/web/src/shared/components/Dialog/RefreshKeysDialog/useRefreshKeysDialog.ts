import { useUIStore } from "@state/index.ts";
import { useCallback } from "react";

export function useRefreshKeysDialog() {
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen("refreshKeys", false);
  }, [setDialogOpen]);

  const handleNodeRemove = useCallback(async () => {
    handleCloseDialog();
  }, [handleCloseDialog]);

  return {
    handleCloseDialog,
    handleNodeRemove,
  };
}
