import { useDevice, useDeviceContext } from "@state/index.ts";
import { useCallback } from "react";

export function useRefreshKeysDialog() {
  const { setDialogOpen } = useDevice();
  const { deviceId } = useDeviceContext();

  // TODO: Implement activeChat state management
  // This was previously in the message store, needs to be moved to UI store or similar
  const _activeChat = 0; // Placeholder

  // Note: Node error tracking has been removed, so this dialog may not function as intended
  // The nodeErrors map that previously tracked key mismatch errors is no longer available

  const handleCloseDialog = useCallback(() => {
    setDialogOpen("refreshKeys", false);
  }, [setDialogOpen]);

  const handleNodeRemove = useCallback(async () => {
    // Node error tracking has been removed
    // This function previously removed a node that had a key mismatch error
    // Now we just close the dialog
    handleCloseDialog();
  }, [handleCloseDialog]);

  return {
    handleCloseDialog,
    handleNodeRemove,
  };
}
