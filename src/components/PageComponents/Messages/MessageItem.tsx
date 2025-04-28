import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { useDevice, useDeviceStore } from "@core/stores/deviceStore.ts";
import { cn } from "@core/utils/cn.ts";
import { Avatar } from "@components/UI/Avatar.tsx";
import { AlertCircle, CheckCircle2, CircleEllipsis } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReactNode, useMemo } from "react";
import { Message, MessageState } from "@core/stores/messageStore.ts";
import { Protobuf } from "@meshtastic/js";
import { MessageActionsMenu } from "@components/PageComponents/Messages/MessageActionsMenu.tsx";

interface MessageProps {
  message: Message;
  // locale?: string; // locale
}

interface MessageStatus {
  state: MessageState;
  displayText: string;
  icon: LucideIcon;
  ariaLabel: string;
}

const MESSAGE_STATUS: Record<MessageState, MessageStatus> = {
  [MessageState.Ack]: { state: MessageState.Ack, displayText: "Message delivered", icon: CheckCircle2, ariaLabel: "Message delivered" },
  [MessageState.Waiting]: { state: MessageState.Waiting, displayText: "Waiting for delivery", icon: CircleEllipsis, ariaLabel: "Sending message" },
  [MessageState.Failed]: { state: MessageState.Failed, displayText: "Delivery failed", icon: AlertCircle, ariaLabel: "Message delivery failed" },
};

const getMessageStatus = (state: MessageState): MessageStatus =>
  MESSAGE_STATUS[state] ?? { state: MessageState.Failed, displayText: "Unknown state", icon: AlertCircle, ariaLabel: "Message status unknown" };

const StatusTooltip = ({ status, children }: { status: MessageStatus; children: ReactNode }) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="bg-gray-800 text-white px-2 py-1 rounded text-xs">
        {status.displayText}
        <TooltipArrow className="fill-gray-800" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const StatusIcon = ({ status, className }: { status: MessageStatus; className?: string }) => {
  const Icon = status.icon;
  const iconClass = cn("w-3.5 h-3.5 shrink-0", className);
  return (
    <StatusTooltip status={status}>
      <span aria-label={status.ariaLabel} role="img">
        <Icon className={iconClass} aria-hidden="true" />
      </span>
    </StatusTooltip>
  );
};

const TimeDisplay = ({ date, className }: { date: number; className?: string }) => {
  const _date = useMemo(() => new Date(date), [date]);
  const locale = 'en-US'; // TODO: Make dynamic
  const formattedTime = useMemo(() => _date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true }), [_date, locale]);
  const fullDate = useMemo(() => _date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }), [_date, locale]);

  return (
    <time dateTime={_date.toISOString()} className={cn("text-xs", className)}>
      <span aria-hidden="true">{formattedTime}</span>
      <span className="sr-only">{fullDate}</span>
    </time>
  );
};

export const MessageItem = ({ message }: MessageProps) => {
  const { getDevices } = useDeviceStore();
  const { getNode } = useDevice()

  const messageUser: Protobuf.Mesh.NodeInfo | null = useMemo(() => {
    if (message?.from === null || message?.from === undefined) return null;
    const fromNode = getNode(message.from);
    if (fromNode) {
      return fromNode ?? null;
    }
    return null;
  }, [getDevices, message.from]);

  const { shortName, displayName } = useMemo(() => {
    const fallbackName = message.from
    const longName = messageUser?.user?.longName;
    const shortName = messageUser?.user?.shortName ?? fallbackName;
    const displayName = longName || fallbackName;
    return { shortName, displayName };
  }, [messageUser, message.from]);

  const messageStatus = getMessageStatus(message.state);
  const messageText = message?.message ?? "";
  const messageDate = message?.date;
  const isFailed = message.state === MessageState.Failed;

  const messageItemWrapperClass = cn(
    "group w-full px-2 py-2 relative list-none",
    "rounded-md",
    "hover:bg-slate-300/15 dark:hover:bg-slate-600/20",
    "transition-colors duration-100 ease-in-out",
  );

  // const avatarSizeClass = "size-11";
  const gridGapClass = "gap-x-2";

  const baseTextStyle = "text-sm text-gray-800 dark:text-gray-200";
  const nameTextStyle = "font-medium text-gray-900 dark:text-gray-100 mr-2";
  const dateTextStyle = "text-gray-500 dark:text-gray-400";
  const statusIconBaseColor = "text-gray-400 dark:text-gray-500";
  const statusIconFailedColor = "text-red-500 dark:text-red-400";

  return (
    <li className={messageItemWrapperClass}>
      <div className={cn("grid grid-cols-[auto_1fr]", gridGapClass)}>
        <Avatar size="sm" text={shortName} className="pt-0.5" />

        <div className="flex flex-col gap-1.5 min-w-0">
          {messageDate != null ? (
            <div className="flex items-center gap-1.5">
              <span className={nameTextStyle} aria-hidden="true">
                {displayName}
              </span>
              <TimeDisplay date={messageDate} className={dateTextStyle} />
              <StatusIcon
                status={messageStatus}
                className={cn(isFailed ? statusIconFailedColor : statusIconBaseColor)}
              />
            </div>
          ) : null}

          <div className={cn(baseTextStyle, "whitespace-pre-wrap")}>
            {messageText}
          </div>

        </div>
      </div>
      <MessageActionsMenu
        onReply={() => console.log("Reply to message:", message.messageId)}
      />
    </li>
  );
};