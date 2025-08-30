import { useDevice, useMessages, useNodeDB } from "@core/stores";
import { useCallback } from "react";

export function useRefreshKeysDialog() {
  const { setDialogOpen } = useDevice();
  const { removeNode, clearNodeError, getNodeError } = useNodeDB();
  const { activeChat } = useMessages();

  const handleCloseDialog = useCallback(() => {
    setDialogOpen("refreshKeys", false);
  }, [setDialogOpen]);

  const handleNodeRemove = useCallback(() => {
    const nodeWithError = getNodeError(activeChat);
    if (!nodeWithError) {
      return;
    }
    clearNodeError(activeChat);
    handleCloseDialog();
    return removeNode(nodeWithError?.node);
  }, [activeChat, clearNodeError, getNodeError, removeNode, handleCloseDialog]);

  return {
    handleCloseDialog,
    handleNodeRemove,
  };
}
