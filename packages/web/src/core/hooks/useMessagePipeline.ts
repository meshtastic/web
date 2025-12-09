import { useMessages } from "@core/stores";
import { autoFavoriteDMHandler } from "@core/stores/messageStore/pipelineHandlers";
import { useEffect, useRef } from "react";

/**
 * Hook to set up the message pipeline handlers for a device.
 * Automatically registers default handlers like auto-favorite for DMs.
 */
export function useMessagePipeline() {
  const messages = useMessages();
  const hasRegistered = useRef(false);

  useEffect(() => {
    // Only register once to prevent render loops
    if (hasRegistered.current) {
      return;
    }

    // Register the auto-favorite DM handler
    messages.registerPipelineHandler("autoFavoriteDM", autoFavoriteDMHandler);
    hasRegistered.current = true;

    // Cleanup: unregister when component unmounts
    return () => {
      messages.unregisterPipelineHandler("autoFavoriteDM");
      hasRegistered.current = false;
    };
  }, [
    // Register the auto-favorite DM handler
    messages.registerPipelineHandler,
    messages.unregisterPipelineHandler,
  ]);
}
