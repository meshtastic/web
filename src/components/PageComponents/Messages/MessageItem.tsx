import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { useDeviceStore } from "@core/stores/deviceStore.ts";
import { cn } from "@core/utils/cn.ts";
import { Avatar } from "@components/UI/Avatar.tsx";
import { AlertCircle, CheckCircle2, CircleEllipsis } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReactNode, useMemo } from "react";
import { Message, MessageState, useMessageStore } from "@core/stores/messageStore.ts";
import { Protobuf } from "@meshtastic/js";

interface MessageProps {
  lastMsgSameUser: boolean;
  message: Message;
}

interface MessageStatus {
  state: MessageState;
  displayText: string;
  icon: LucideIcon;
}

const MESSAGE_STATUS: Record<MessageState, MessageStatus> = {
  [MessageState.Ack]: { state: MessageState.Ack, displayText: "Message delivered", icon: CheckCircle2 },
  [MessageState.Waiting]: { state: MessageState.Waiting, displayText: "Waiting for delivery", icon: CircleEllipsis },
  [MessageState.Failed]: { state: MessageState.Failed, displayText: "Delivery failed", icon: AlertCircle },
};

const getMessageStatus = (state: MessageState): MessageStatus =>
  MESSAGE_STATUS[state] ?? { state: MessageState.Failed, displayText: "Unknown state", icon: AlertCircle };


const StatusTooltip = ({ status, children }: { status: MessageStatus; children: ReactNode }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent /* ...props... */ >
        {status.displayText}
        <TooltipArrow className="fill-slate-800" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const StatusIcon = ({ status, className, ...otherProps }: { status: MessageStatus; className?: string }) => {
  const isFailed = status.state === MessageState.Failed;
  const iconClass = cn("w-4 h-4 shrink-0", className);
  const Icon = status.icon;
  return (
    <StatusTooltip status={status}>
      <Icon className={iconClass} {...otherProps} color={isFailed ? "currentColor" : undefined} />
    </StatusTooltip>
  );
};

const getMessageTextStyles = (status: MessageState, isDeviceUser: boolean) => {
  const isFailed = status === MessageState.Failed;
  return cn(
    "break-words overflow-hidden whitespace-pre-wrap flex items-center gap-1.5",
    isFailed && (isDeviceUser ? "text-red-500" : "text-red-600 dark:text-red-500")
  );
};


const TimeDisplay = ({ date, className }: { date: number; className?: string }) => {
  const _date = new Date(date);
  const locale = 'en-US'; // TODO: this should be dynamic based on user settings
  return (
    <div className={cn("flex items-center gap-1 text-xs font-mono", className)}>
      <span>
        {_date?.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true })}
      </span>
      {/* TODO: Conditionally show date for older messages? */}
    </div>
  );
};

export const MessageItem = ({ lastMsgSameUser, message }: MessageProps) => {
  const myNodeNum = useMessageStore((state) => state.nodeNum);

  const { getDevices } = useDeviceStore();

  const isDeviceUser = message.from === myNodeNum;

  const messageUser: Protobuf.Mesh.NodeInfo | null = useMemo(() => {
    if (message?.from === null || message?.from === undefined) return null;
    for (const device of getDevices()) {
      console.log("MessageItem: getDevices", { device });

      if (device.nodes.has(message.from)) {
        console.log("MessageItem hasNode", { device, message });

        return device.nodes.get(message.from) ?? null;
      }
    }
    return null;
  }, [getDevices, message.from]);

  const fallbackName = `${message.from}`;
  const longName = messageUser?.user?.longName;
  const shortName = messageUser?.user?.shortName ?? fallbackName.slice(0, 2).toUpperCase();
  const displayName = isDeviceUser ? "You" : (longName || fallbackName);

  const messageContainerClass = cn(
    "flex flex-col w-full px-4 justify-start",
    !lastMsgSameUser ? "pt-3" : "pt-0.5"
  );
  const alignmentClass = cn(
    "flex flex-col flex-wrap w-full",
    isDeviceUser ? "items-end" : "items-start"
  );
  const bubbleBaseStyle = "flex flex-col max-w-[75%] rounded-lg px-3 py-1.5 text-sm shadow-md";
  const sentBubbleStyle = "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white";
  const receivedBubbleStyle = "bg-slate-200 dark:bg-slate-500 text-slate-900 dark:text-white";
  const timeStatusColor = isDeviceUser ? "text-blue-100 dark:text-blue-200" : "text-slate-500 dark:text-slate-300";

  const messageStatus = getMessageStatus(message.state);


  return (
    <div className={messageContainerClass}>
      <div className={alignmentClass}>

        {/* Show only if not consecutive message AND not sent by self */}
        {!lastMsgSameUser && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <Avatar text={shortName} />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
              {displayName}
            </span>
          </div>
        )}

        <div className={cn(
          bubbleBaseStyle,
          isDeviceUser ? sentBubbleStyle : receivedBubbleStyle
        )}>
          <div className={cn("flex items-center gap-1.5 mt-1 self-end", timeStatusColor)}>
            <TimeDisplay date={message.date} />
          </div>

          <div className={cn(getMessageTextStyles(message.state, isDeviceUser))}>
            {message.message || <span className="italic opacity-70">Empty message</span>}
            {isDeviceUser && <StatusIcon status={messageStatus} />}
          </div>
        </div>
      </div>
    </div>
  );
};

