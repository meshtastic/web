import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@app/components/UI/Tooltip";
import { useAppStore } from "@app/core/stores/appStore";
import {
  type MessageWithState,
  useDeviceStore,
} from "@app/core/stores/deviceStore.ts";
import { cn } from "@app/core/utils/cn";
import { Avatar } from "@components/UI/Avatar";
import type { Protobuf } from "@meshtastic/js";
import { AlertCircle, CheckCircle2, CircleEllipsis } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

const MESSAGE_STATES = {
  ACK: "ack",
  WAITING: "waiting",
  FAILED: "failed",
} as const;

type MessageState = MessageWithState["state"];

interface MessageProps {
  lastMsgSameUser: boolean;
  message: MessageWithState;
  sender: Protobuf.Mesh.NodeInfo;
}

interface StatusTooltipProps {
  state: MessageState;
  children: React.ReactNode;
}

interface StatusIconProps {
  state: MessageState;
  className?: string;
}

const STATUS_TEXT_MAP: Record<MessageState, string> = {
  [MESSAGE_STATES.ACK]: "Message delivered",
  [MESSAGE_STATES.WAITING]: "Waiting for delivery",
  [MESSAGE_STATES.FAILED]: "Delivery failed",
} as const;

const STATUS_ICON_MAP: Record<MessageState, LucideIcon> = {
  [MESSAGE_STATES.ACK]: CheckCircle2,
  [MESSAGE_STATES.WAITING]: CircleEllipsis,
  [MESSAGE_STATES.FAILED]: AlertCircle,
} as const;

const getStatusText = (state: MessageState): string => STATUS_TEXT_MAP[state];

const StatusTooltip = ({ state, children }: StatusTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95"
        side="top"
        align="center"
        sideOffset={5}
      >
        {getStatusText(state)}
        <TooltipArrow className="fill-slate-800" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const StatusIcon = ({ state, className, ...otherProps }: StatusIconProps) => {
  const isFailed = state === MESSAGE_STATES.FAILED;
  const iconClass = cn(
    className,
    "text-gray-500 dark:text-gray-400 w-4 h-4 flex-shrink-0",
  );

  const Icon = STATUS_ICON_MAP[state];
  return (
    <StatusTooltip state={state}>
      <Icon
        className={iconClass}
        {...otherProps}
        color={isFailed ? "red" : "currentColor"}
      />
    </StatusTooltip>
  );
};

const getMessageTextStyles = (state: MessageState) => {
  const isAcknowledged = state === MESSAGE_STATES.ACK;
  const isFailed = state === MESSAGE_STATES.FAILED;
  const isWaiting = state === MESSAGE_STATES.WAITING;

  return cn(
    "break-words overflow-hidden",
    isAcknowledged
      ? "text-black dark:text-white"
      : "text-black dark:text-gray-400",
    isFailed && "text-red-500 dark:text-red-500",
  );
};

const TimeDisplay = ({
  date,
  className,
}: { date: Date; className?: string }) => (
  <div className={cn("flex items-center gap-2 flex-shrink-0", className)}>
    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
      {date.toLocaleDateString()}
    </span>
    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
      {date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  </div>
);

export const Message = ({ lastMsgSameUser, message, sender }: MessageProps) => {
  const { getDevices } = useDeviceStore();

  const isDeviceUser = useMemo(
    () =>
      getDevices()
        .map((device) => device.nodes.get(device.hardware.myNodeNum)?.num)
        .includes(message.from),
    [getDevices, message.from],
  );
  const messageUser = sender?.user;

  const messageTextClass = getMessageTextStyles(message.state);

  return (
    <div className="flex flex-col w-full px-4 justify-start">
      <div
        className={cn(
          "flex flex-col flex-wrap items-start py-1",
          isDeviceUser && "items-end",
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          {!lastMsgSameUser ? (
            <div className="flex place-items-center gap-2 mb-1">
              <Avatar text={messageUser?.shortName} />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {messageUser?.longName}
                </span>
              </div>
            </div>
          ) : null}
        </div>
        <TimeDisplay date={message.rxTime} />
        <div className="flex place-items-center gap-2 pb-2">
          <div className={cn(isDeviceUser && "pl-11", messageTextClass)}>
            {message.data}
          </div>
          <StatusIcon state={message.state} />
        </div>
      </div>
    </div>
  );
};
