import { autoFavoriteDMHandler } from "@core/stores/messageStore/pipelineHandlers";
import { useMessages } from "@core/stores";
import { useEffect } from "react";

/**
 * Hook to set up the message pipeline handlers for a device.
 * Automatically registers default handlers like auto-favorite for DMs.
 */
export function useMessagePipeline() {
  const messages = useMessages();

  useEffect(() => {
    // Register the auto-favorite DM handler
    messages.registerPipelineHandler("autoFavoriteDM", autoFavoriteDMHandler);

    // Cleanup: unregister when component unmounts
    return () => {
      messages.unregisterPipelineHandler("autoFavoriteDM");
    };
  }, [messages]);
}
