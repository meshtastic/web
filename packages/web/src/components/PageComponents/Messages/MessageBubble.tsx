import { NodeAvatar } from "@components/NodeAvatar";
import logger from "../../../core/services/logger.ts";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { cn } from "@core/utils/cn";
import { getAvatarColors } from "@core/utils/color";
import type { Message } from "@db/schema";
import { Reply } from "lucide-react";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EmojiReactionButton } from "./EmojiReactionButton.tsx";
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

export const MessageBubble = memo(function MessageBubble({
  message,
  senderName,
  isMine,
  showAvatar = true,
  showTimestamp = true,
  deviceId,
}: MessageBubbleProps) {
  const { t } = useTranslation("messages");
  const avatarColors = getAvatarColors(message.fromNode);

  // Memoize the background color style to prevent new object creation on every render
  const bubbleStyle = useMemo(
    () => ({
      backgroundColor: `color-mix(in srgb, ${avatarColors.bgColor} 40%, black)`,
    }),
    [avatarColors.bgColor],
  );

  // Darker version of avatar color for metadata (hops, SNR, RSSI)
  const metadataColorStyle = useMemo(
    () => ({
      color: `color-mix(in srgb, ${avatarColors.bgColor} 20%, white)`,
    }),
    [avatarColors.bgColor],
  );

  // Memoize formatted time string
  const formattedTime = useMemo(
    () =>
      new Date(message.date).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    [message.date],
  );

  const isoDate = useMemo(
    () => new Date(message.date).toISOString(),
    [message.date],
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 w-full",
        isMine ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar */}
      {showAvatar && (
        <NodeAvatar
          nodeNum={message.fromNode}
          longName={senderName}
          size="sm"
        />
      )}

      {/* Message Bubble */}
      <div
        className="max-w-[70%] rounded-2xl px-3 py-2 relative group shrink-0 text-white"
        style={bubbleStyle}
      >
        {/* Top Row: Sender Name (longName + nodeNum) and Action Buttons */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5">
            <p className="text-xs md:text-sm font-medium opacity-80">
              {senderName || "Unknown"} (!
              {message.fromNode.toString(16).toLowerCase()})
            </p>
            {message.viaMqtt && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-base">☁️</span>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
                  {t("MQTT")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* Action Buttons - Emoji and Reply */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <EmojiReactionButton
                  onEmojiSelect={(emoji) => {
                    logger.debug("Selected emoji:", emoji.emoji);
                  }}
                />
              </TooltipTrigger>
              <TooltipContent className="bg-slate-800 text-white px-2 py-1 rounded text-xs">
                {t("actionsMenu.addReaction", "Add reaction")}
                <TooltipArrow className="fill-slate-800" />
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded transition-colors hover:bg-white/20"
                  aria-label={t("actionsMenu.reply", "Reply")}
                  onClick={() => {
                    // TODO: Implement reply
                  }}
                >
                  <Reply className="size-5 opacity-90" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-800 text-white px-2 py-1 rounded text-xs">
                {t("actionsMenu.reply", "Reply")}
                <TooltipArrow className="fill-slate-800" />
              </TooltipContent>
            </Tooltip>
            {isMine && (
              <MessageStatusIndicator
                message={message}
                className="shrink-0 ml-1"
              />
            )}
          </div>
        </div>

        {/* Middle Row: Message Content */}
        <p className="text-sm md:text-base leading-relaxed wrap-break-word">
          {message.message}
        </p>

        {/* Bottom Row: Timestamp (am/pm), Hops, SNR, RSSI */}
        <div
          className={cn(
            "flex items-center flex-wrap mt-1 gap-x-2 gap-y-0.5 text-xs md:text-sm",
            isMine ? "justify-end" : "justify-start",
          )}
        >
          {message.hops > 0 && (
            <span style={metadataColorStyle}>
              {message.hops} {t("unit.hops", "hops")}
            </span>
          )}
          {message.rxSnr !== 0 && (
            <span style={metadataColorStyle}>
              {t("unit.snr", "SNR")} {message.rxSnr}
              {t("unit.db", "dB")}
            </span>
          )}
          {message.rxRssi !== 0 && (
            <span style={metadataColorStyle}>RSSI {message.rxRssi}dBm</span>
          )}
          {showTimestamp && (
            <time dateTime={isoDate} className="ml-auto">
              {formattedTime}
            </time>
          )}
        </div>

        {/* Retry Button for Failed Messages */}
        {isMine && deviceId && (
          <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <RetryButton
              messageId={message.id}
              deviceId={deviceId}
              className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
});
