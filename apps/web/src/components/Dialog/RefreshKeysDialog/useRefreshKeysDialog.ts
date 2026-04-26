import { useDevice } from "@core/stores";
import { useActiveClient, useNodeErrors } from "@meshtastic/sdk-react";
import { useCallback } from "react";

export function useRefreshKeysDialog() {
  const { setDialogOpen } = useDevice();
  const meshClient = useActiveClient();
  const error = useNodeErrors()[0];

  const handleCloseDialog = useCallback(() => {
    setDialogOpen("refreshKeys", false);
  }, [setDialogOpen]);

  const handleNodeRemove = useCallback(() => {
    if (!meshClient || !error) return;
    meshClient.nodes.clearError(error.node);
    handleCloseDialog();
    void meshClient.nodes.remove(error.node);
  }, [meshClient, error, handleCloseDialog]);

  return {
    handleCloseDialog,
    handleNodeRemove,
  };
}
