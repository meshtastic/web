import logger from "@core/services/logger";
import type { Message, Reaction } from "@data/schema";
import { NodeAvatar } from "@shared/components/NodeAvatar.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/utils/cn";
import { getAvatarColors } from "@shared/utils/color";
import { Reply } from "lucide-react";
import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { groupReactions } from "../hooks/useReactions.ts";
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
  onReply?: (message: Message) => void;
  replyToMessage?: Message;
  replyToSenderName?: string;
  reactions?: Reaction[];
  onReact?: (emoji: string) => void;
  nodeNameResolver?: (nodeNum: number) => string | undefined;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  myNodeNum,
  senderName,
  isMine,
  showAvatar = true,
  showTimestamp = true,
  onReply,
  replyToMessage,
  replyToSenderName,
  reactions = [],
  onReact,
  nodeNameResolver,
}: MessageBubbleProps) {
  const { t } = useTranslation("messages");
  const avatarColors = getAvatarColors(message.fromNode);

  const groupedReactions = useMemo(
    () => groupReactions(reactions),
    [reactions],
  );

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
      {showAvatar ? (
        <NodeAvatar
          nodeNum={message.fromNode}
          longName={senderName}
          size="sm"
        />
      ) : null}

      <div
        className="max-w-[70%] rounded-2xl px-3 py-2 relative group shrink-0 text-white"
        style={bubbleStyle}
      >
        {/* Reply preview - shown when this message is a reply */}
        {message.replyId ? (
          <div className="mb-2 text-xs opacity-70 border-l-2 border-white/40 pl-2">
            {replyToMessage ? (
              <>
                <p className="font-medium">
                  {replyToMessage.fromNode === myNodeNum
                    ? t("reply.you", "You")
                    : replyToSenderName ||
                      `!${replyToMessage.fromNode.toString(16).toLowerCase()}`}
                </p>
                <p className="truncate max-w-[200px]">
                  {replyToMessage.message}
                </p>
              </>
            ) : (
              <p className="italic">
                {t("reply.unknownMessage", "Reply to unknown message")}
              </p>
            )}
          </div>
        ) : null}

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
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <EmojiReactionButton
                  onEmojiSelect={(emoji) => {
                    logger.debug("Selected emoji:", emoji);
                    onReact?.(emoji);
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
                  onClick={() => onReply?.(message)}
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

        <p className="text-sm md:text-base leading-relaxed wrap-break-word">
          {message.message}
        </p>

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

        {/* Reactions overlay */}
        {groupedReactions.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "absolute -bottom-3 flex gap-0.5 bg-background/95 backdrop-blur-sm rounded-full px-1.5 py-0.5 shadow-sm border border-border cursor-pointer hover:bg-accent transition-colors",
                  isMine ? "right-2" : "left-2",
                )}
              >
                {groupedReactions.slice(0, 5).map(({ emoji, count }) => (
                  <span key={emoji} className="flex items-center text-sm">
                    {emoji}
                    {count > 1 && (
                      <span className="text-xs text-muted-foreground ml-0.5">
                        {count}
                      </span>
                    )}
                  </span>
                ))}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-2"
              side="top"
              align={isMine ? "end" : "start"}
            >
              <div className="space-y-1">
                {groupedReactions.map(({ emoji, fromNodes }) => (
                  <div key={emoji} className="flex items-center gap-2 text-sm">
                    <span className="text-base">{emoji}</span>
                    <span className="text-muted-foreground">
                      {fromNodes
                        .map(
                          (node) =>
                            nodeNameResolver?.(node) ||
                            `!${node.toString(16).toLowerCase()}`,
                        )
                        .join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {isMine && (
          <div className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <RetryButton
              message={message}
              className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
});
