import logger from "@core/services/logger";
import { Button } from "@shared/components/ui/button";
import { useDevice } from "@core/stores";
import { cn } from "@shared/utils/cn";
import { DB_EVENTS, dbEvents } from "@data/events";
import { messageRepo } from "@data/index";
import type { Message } from "@data/schema";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface RetryButtonProps {
  message: Message;
  className?: string;
}

/**
 * RetryButton - Button to retry failed messages
 */
export const RetryButton = ({ message, className }: RetryButtonProps) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(message);
  const device = useDevice();

  // Update message when database changes
  useEffect(() => {
    setCurrentMessage(message);
  }, [message]);

  const handleRetry = async () => {
    if (isRetrying || !device.connection) {
      return;
    }

    setIsRetrying(true);
    try {
      // Determine destination based on message type
      const isDirect = currentMessage.type === "direct";
      const toValue = isDirect ? currentMessage.toNode : ("broadcast" as const);
      const channelValue = isDirect ? undefined : currentMessage.channelId;

      logger.debug(`[RetryButton] Retrying message ${currentMessage.id}...`);

      // Send message over radio
      const newMessageId = await device.connection.sendText(
        currentMessage.message,
        toValue,
        true,
        channelValue,
      );

      if (newMessageId !== undefined) {
        // Increment retry count and update state in database
        await messageRepo.incrementRetryCount(
          currentMessage.id,
          currentMessage.deviceId,
        );
        await messageRepo.updateMessageState(
          currentMessage.id,
          currentMessage.deviceId,
          "sent",
        );

        // Emit event to trigger UI refresh
        dbEvents.emit(DB_EVENTS.MESSAGE_SAVED);

        logger.debug(
          `[RetryButton] Message ${currentMessage.id} retried successfully with new ID ${newMessageId}`,
        );
      }
    } catch (error) {
      logger.error(
        `[RetryButton] Failed to retry message ${currentMessage.id}:`,
        error,
      );

      // Increment retry count and mark as failed again
      await messageRepo.incrementRetryCount(
        currentMessage.id,
        currentMessage.deviceId,
      );
      await messageRepo.updateMessageState(
        currentMessage.id,
        currentMessage.deviceId,
        "failed",
      );
      dbEvents.emit(DB_EVENTS.MESSAGE_SAVED);
    } finally {
      setIsRetrying(false);
    }
  };

  // Only show retry button for failed messages that haven't exceeded max retries
  if (currentMessage.state !== "failed") {
    return null;
  }
  if (currentMessage.retryCount >= currentMessage.maxRetries) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRetry}
      disabled={isRetrying}
      className={className}
      title={`Retry (attempt ${currentMessage.retryCount + 1}/${currentMessage.maxRetries})`}
    >
      <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
    </Button>
  );
};
