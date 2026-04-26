import { useDevice, useMessages } from "@core/stores";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useCallback } from "react";

export function useRefreshKeysDialog() {
  const { setDialogOpen } = useDevice();
  const meshClient = useActiveClient();
  const { activeChat } = useMessages();

  const handleCloseDialog = useCallback(() => {
    setDialogOpen("refreshKeys", false);
  }, [setDialogOpen]);

  const handleNodeRemove = useCallback(() => {
    if (!meshClient) return;
    const error = meshClient.nodes.errorFor(activeChat);
    if (!error) return;
    meshClient.nodes.clearError(activeChat);
    handleCloseDialog();
    void meshClient.nodes.remove(error.node);
  }, [meshClient, activeChat, handleCloseDialog]);

  return {
    handleCloseDialog,
    handleNodeRemove,
  };
}
