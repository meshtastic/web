import { DB_EVENTS, dbEvents } from "@data/events";
import { messageRepo } from "@data/index";
import { useDeviceContext } from "@shared/hooks/useDeviceContext";
import { useCallback } from "react";

/**
 * Hook to delete all messages for the current device
 */
export function useDeleteMessages() {
  const { deviceId } = useDeviceContext();

  const deleteAllMessages = useCallback(async () => {
    await messageRepo.deleteAllMessages(deviceId);
    // Emit event to trigger reactivity
    dbEvents.emit(DB_EVENTS.MESSAGE_SAVED);
  }, [deviceId]);

  return { deleteAllMessages };
}
