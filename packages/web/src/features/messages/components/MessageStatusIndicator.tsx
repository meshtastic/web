import type { Message } from "@data/schema";
import { Spinner } from "@shared/components/ui/spinner";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/utils/cn";
import { Check, Clock, CloudCheck, X } from "lucide-react";
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
        return <Spinner size="sm" inline className="text-blue-500" />;

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
        <TooltipContent className="bg-slate-800 text-white px-2 py-1 rounded text-xs">
          {getStatusText()}
          <TooltipArrow className="fill-slate-800" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
