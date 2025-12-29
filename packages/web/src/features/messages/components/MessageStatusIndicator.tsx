import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/utils/cn";
import type { Message } from "@data/schema";
import { Check, Clock, CloudCheck, Loader2, X } from "lucide-react";
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
        return <Clock className="size-4 md:size-5 text-muted-foreground" />;

      case "sending":
        return (
          <Loader2 className="size-4 md:size-5 text-blue-500 animate-spin [animation-duration:4s]" />
        );

      case "sent":
        return (
          <div className="relative opacity-80">
            <Check className="md:size-5 size-4" />
          </div>
        );

      case "ack":
        return (
          <div className="relative opacity-80">
            <CloudCheck className="md:size-5 size-4" />
          </div>
        );

      case "failed":
        return <X className="size-4 md:size-5 text-red-500" />;

      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (message.state) {
      case "waiting":
        return t("deliveryStatus.waiting");
      case "sending":
        return t("deliveryStatus.sending");
      case "sent":
        return t("deliveryStatus.sent");
      case "ack":
        return message.realACK
          ? t("deliveryStatus.ack.delivered")
          : t("deliveryStatus.ack.acknowledged");
      case "failed":
        return message.ackError && message.ackError !== 0
          ? t("deliveryStatus.failed", {
              error: `Error ${message.ackError}`,
            })
          : t("deliveryStatus.failed", { error: "" });
      default:
        return "";
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1 text-xs", className)}>
            {getStatusIcon()}

            {message.state === "failed" &&
              message.retryCount !== undefined &&
              message.retryCount > 0 &&
              message.maxRetries !== undefined && (
                <span className="text-muted-foreground">
                  (retry {message.retryCount}/{message.maxRetries})
                </span>
              )}

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
