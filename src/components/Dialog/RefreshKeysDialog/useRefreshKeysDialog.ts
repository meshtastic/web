import { useCallback } from "react";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useMessageStore } from "@core/stores/messageStore.ts";

export function useRefreshKeysDialog() {
  const { removeNode, setDialogOpen, clearNodeError, getNodeError } = useDevice();
  const { activeChat } = useMessageStore();

  const handleNodeRemove = useCallback(() => {
    const nodeWithError = getNodeError(activeChat);
    if (!nodeWithError) {
      return;
    }
    clearNodeError(activeChat);
    handleCloseDialog();;
    return removeNode(nodeWithError?.node);
  }, [activeChat, clearNodeError, setDialogOpen, removeNode]);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen('refreshKeys', false);
  }, [setDialogOpen])

  return {
    handleCloseDialog,
    handleNodeRemove
  };

}