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
import { Message, MessageState } from "@core/services/types.ts";

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
  ack: { state: "ack", displayText: "Message delivered", icon: CheckCircle2 },
  waiting: { state: "waiting", displayText: "Waiting for delivery", icon: CircleEllipsis },
  failed: { state: "failed", displayText: "Delivery failed", icon: AlertCircle },
};

const getMessageStatus = (state: MessageState): MessageStatus =>
  MESSAGE_STATUS[state] || { state: "failed", displayText: "Unknown error", icon: AlertCircle };

const StatusTooltip = ({ status, children }: { status: MessageStatus; children: ReactNode }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95"
        side="top"
        align="center"
        sideOffset={5}
      >
        {status.displayText}
        <TooltipArrow className="fill-slate-800" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const StatusIcon = ({ status, className, ...otherProps }: { status: MessageStatus; className?: string }) => {
  const isFailed = status.state === "failed";
  const iconClass = cn("text-slate-500 dark:text-slate-400 w-4 h-4 shrink-0", className);
  const Icon = status.icon;

  return (
    <StatusTooltip status={status}>
      <Icon className={iconClass} {...otherProps} color={isFailed ? "red" : "currentColor"} />
    </StatusTooltip>
  );
};

const getMessageTextStyles = (status: MessageStatus) => {
  const isAcknowledged = status.state === "ack";
  const isFailed = status.state === "failed";

  return cn(
    "break-words overflow-hidden",
    isAcknowledged ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-slate-400",
    isFailed && "text-red-500 dark:text-red-500",
  );
};

const TimeDisplay = ({ date, className }: { date: Date; className?: string }) => (
  <div className={cn("flex items-center gap-2 shrink-0", className)}>
    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{date.toLocaleDateString()}</span>
    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
      {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
    </span>
  </div>
);

export const MessageItem = ({ lastMsgSameUser, message }: MessageProps) => {
  const { getDevices } = useDeviceStore();

  const isDeviceUser = useMemo(
    () =>
      getDevices()
        .map((device) => device.nodes.get(device.hardware.myNodeNum)?.num)
        .includes(message.from),
    [getDevices, message.from],
  );

  const messageUser = message?.from
    ? getDevices().find((device) => device.nodes.has(message.from))?.nodes.get(message.from)
    : null;

  const messageStatus = getMessageStatus(message.state);
  const messageTextClass = getMessageTextStyles(messageStatus);

  return (
    <div className="flex flex-col w-full px-4 justify-start">
      <div className={cn("flex flex-col flex-wrap items-start py-1", messageTextClass, isDeviceUser && "items-end")}>
        <div className="flex items-center gap-2 mb-2">
          {!lastMsgSameUser && (
            <div className="flex place-items-center gap-2 mb-1">
              <Avatar text={messageUser?.user?.shortName ?? "UNK"} />
              <div className="flex flex-col">
                <span className="font-medium text-slate-900 dark:text-white truncate">
                  {messageUser?.user?.longName}
                </span>
              </div>
            </div>
          )}
        </div>
        <TimeDisplay date={message.date} />
        <div className="flex place-items-center gap-2 pb-2">
          <div className={cn(isDeviceUser && "pl-11", messageTextClass)}>{message.message}</div>
          <StatusIcon status={messageStatus} />
        </div>
      </div>
    </div>
  );
};
