import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import type { Message } from "@db/schema";
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
      case "waiting":
        return <Clock className="size-4 text-muted-foreground" />;

      case "sending":
        return <Loader2 className="size-4 text-blue-500 animate-spin" />;

      case "sent":
        return <Check className="size-4 text-muted-foreground" />;

      case "ack":
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

      case "failed":
        return <X className="size-3 text-red-500" />;

      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (message.state) {
      case "waiting":
        return t("deliveryStatus.waiting.text");
      case "sending":
        return t("deliveryStatus.sending.text");
      case "sent":
        return t("deliveryStatus.sent.text");
      case "ack":
        return message.realACK
          ? t("deliveryStatus.ack.delivered")
          : t("deliveryStatus.ack.acknowledged");
      case "failed":
        return message.ackError && message.ackError !== 0
          ? t("deliveryStatus.failed.text", {
              error: `Error ${message.ackError}`,
            })
          : t("deliveryStatus.failed.text", { error: "" });
      default:
        return "";
    }
  };

  // Always show - the parent component (MessageBubble) already filters by isMine
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1 text-xs", className)}>
            {getStatusIcon()}

            {/* Show retry count for failed messages ONLY */}
            {message.state === "failed" &&
              message.retryCount !== undefined &&
              message.retryCount > 0 &&
              message.maxRetries !== undefined && (
                <span className="text-muted-foreground">
                  (retry {message.retryCount}/{message.maxRetries})
                </span>
              )}

            {/* Show SNR for acknowledged messages - only if SNR is meaningful */}
            {message.state === "ack" &&
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
