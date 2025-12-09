import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { MessageState } from "@core/stores/messageStore";
import type { Message } from "@core/stores/messageStore/types";
import { cn } from "@core/utils/cn";
import { Check, Clock, Cloud, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MessageStatusIndicatorProps {
  message: Message;
  className?: string;
}

/**
 * MessageStatusIndicator - Shows the transmission status of a message
 *
 * States:
 * - Waiting: Clock icon (message queued)
 * - Sending: Spinner (message being transmitted)
 * - Sent: Single check (delivered to radio)
 * - Ack: Double check (acknowledged by recipient)
 * - Failed: X icon (transmission failed)
 */
export const MessageStatusIndicator = ({
  message,
  className,
}: MessageStatusIndicatorProps) => {
  const { t } = useTranslation("messages");

  const getStatusIcon = () => {
    switch (message.state) {
      case MessageState.Waiting:
        return <Clock className="size-4 text-muted-foreground" />;

      case MessageState.Sending:
        return <Loader2 className="size-4 text-blue-500 animate-spin" />;

      case MessageState.Sent:
        return <Check className="size-4 text-muted-foreground" />;

      case MessageState.Ack:
        if (message.realACK) {
          return (
            <div className="relative">
              <Cloud className="size-4 text-green-500" />
              <Check className="size-2 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          );
        }
        return (
          <div className="relative">
            <Cloud className="size-4 text-blue-500" />
            <Check className="size-2 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
        );

      case MessageState.Failed:
        return <X className="size-3 text-red-500" />;

      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (message.state) {
      case MessageState.Waiting:
        return t("deliveryStatus.waiting.text");
      case MessageState.Sending:
        return t("deliveryStatus.sending.text");
      case MessageState.Sent:
        return t("deliveryStatus.sent.text");
      case MessageState.Ack:
        return message.realACK
          ? t("deliveryStatus.ack.delivered")
          : t("deliveryStatus.ack.acknowledged");
      case MessageState.Failed:
        return message.ackError && message.ackError !== 0
          ? t("deliveryStatus.failed.text", {
              error: `Error ${message.ackError}`,
            })
          : t("deliveryStatus.failed.text", { error: "" });
      default:
        return "";
    }
  };

  const shouldShow = () => {
    // Don't show status for received messages (only for sent messages)
    const isMine =
      message.from === message.to || message.state !== MessageState.Ack;
    return message.state !== MessageState.Waiting || isMine;
  };

  if (!shouldShow()) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1 text-xs", className)}>
            {getStatusIcon()}

            {/* Show retry count for failed messages ONLY */}
            {message.state === MessageState.Failed &&
              message.retryCount !== undefined &&
              message.retryCount > 0 &&
              message.maxRetries !== undefined && (
                <span className="text-muted-foreground">
                  (retry {message.retryCount}/{message.maxRetries})
                </span>
              )}

            {/* Show SNR for acknowledged messages - only if SNR is meaningful */}
            {message.state === MessageState.Ack &&
              message.ackSNR &&
              message.ackSNR > 0 && (
                <span className="text-muted-foreground">
                  ({message.ackSNR.toFixed(1)}dB)
                </span>
              )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-2 py-1 rounded text-xs">
          {getStatusText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
