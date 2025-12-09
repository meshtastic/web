import { useMessageStore } from "@core/stores/messageStore";
import { MessageState } from "@core/stores/messageStore";
import { RefreshCw } from "lucide-react";
import { Button } from "@components/ui/button";
import { cn } from "@core/utils/cn";
import { useState } from "react";

interface RetryButtonProps {
  messageId: number;
  deviceId: number;
  className?: string;
}

/**
 * RetryButton - Button to retry failed messages
 */
export const RetryButton = ({ 
  messageId, 
  deviceId, 
  className 
}: RetryButtonProps) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const messageStore = useMessageStore((state) => state.getMessageStore(deviceId));

  const handleRetry = async () => {
    if (!messageStore || isRetrying) return;

    setIsRetrying(true);
    try {
      await messageStore.retryMessage(messageId);
      console.log(`[RetryButton] Retried message ${messageId}`);
    } catch (error) {
      console.error(`[RetryButton] Failed to retry message ${messageId}:`, error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!messageStore) return null;

  const message = messageStore.getMessage(messageId);
  if (!message || message.state !== MessageState.Failed) return null;
  if (message.retryCount >= message.maxRetries) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRetry}
      disabled={isRetrying}
      className={className}
      title={`Retry (attempt ${message.retryCount + 1}/${message.maxRetries})`}
    >
      <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
    </Button>
  );
};