import { NodeAvatar } from "@components/NodeAvatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import type { Message } from "@core/stores/messageStore/types";
import { cn } from "@core/utils/cn";
import { getAvatarColors } from "@core/utils/color";
import { MessageStatusIndicator } from "./MessageStatusIndicator.tsx";
import { RetryButton } from "./RetryButton.tsx";

interface MessageBubbleProps {
  message: Message;
  myNodeNum?: number;
  senderName?: string;
  isMine: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  deviceId?: number;
}

export const MessageBubble = ({
  message,
  senderName,
  isMine,
  showAvatar = true,
  showTimestamp = true,
  deviceId,
}: MessageBubbleProps) => {
  const avatarColors = getAvatarColors(message.from);

  return (
    <div
      className={cn(
        "flex gap-2 items-start w-full",
        isMine ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      {showAvatar && !isMine && (
        <NodeAvatar nodeNum={message.from} longName={senderName} size="sm" />
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-3 py-2 relative group flex-shrink-0",
          isMine ? "bg-primary text-primary-foreground" : "bg-card",
        )}
      >
        {/* Sender Name (for non-mine messages) */}
        {!isMine && senderName && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <p
              className="text-xs font-medium"
              style={{ color: avatarColors.bgColor }}
            >
              {senderName}
            </p>
            {message.viaMqtt && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-base">☁️</span>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
                    MQTT
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Message Content */}
        <p className="text-sm leading-relaxed break-words">{message.message}</p>

        {/* Timestamp and Status */}
        <div
          className={cn(
            "flex items-center justify-between mt-1 gap-2",
            isMine ? "flex-row-reverse" : "flex-row",
          )}
        >
          {/* Timestamp */}
          {showTimestamp && (
            <p
              className={cn(
                "text-xs",
                isMine ? "text-primary-foreground/60" : "text-muted-foreground",
              )}
            >
              {new Date(message.date).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {/* Status Indicator - Only for sent messages */}
          {isMine && (
            <MessageStatusIndicator message={message} className="shrink-0" />
          )}
        </div>

        {/* Retry Button for Failed Messages */}
        {isMine && deviceId && (
          <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <RetryButton
              messageId={message.messageId}
              deviceId={deviceId}
              className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
};
