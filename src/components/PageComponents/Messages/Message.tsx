import { memo, useMemo } from "react";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import {
  type MessageWithState,
  useDeviceStore,
} from "@core/stores/deviceStore.ts";
import { cn } from "@core/utils/cn.ts";
import { Avatar } from "@components/UI/Avatar.tsx";
import type { Protobuf } from "@meshtastic/core";
import { AlertCircle, CheckCircle2, CircleEllipsis, LucideIcon } from "lucide-react";

type MessageStateValue = {
  state: string;
  icon: LucideIcon;
  displayText: string;
}

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

const MESSAGE_STATES: Record<string, MessageStateValue> = {
  ACK: { state: 'ack', icon: CheckCircle2, displayText: "Message delivered" },
  WAITING: { state: 'waiting', icon: CircleEllipsis, displayText: "Waiting for delivery" },
  FAILED: { state: 'failed', icon: AlertCircle, displayText: "Delivery failed" },
};

const getMessageState = (state: MessageState): MessageStateValue => {
  switch (state) {
    case MESSAGE_STATES.ACK.state:
      return MESSAGE_STATES.ACK;
    case MESSAGE_STATES.WAITING.state:
      return MESSAGE_STATES.WAITING;
    case MESSAGE_STATES.FAILED.state:
      return MESSAGE_STATES.FAILED;
    default:
      return MESSAGE_STATES.FAILED;
  }
}

const StatusTooltip = ({ state, children }: StatusTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white dark:text-white shadow-md animate-in fade-in-0 zoom-in-95"
        side="top"
        align="center"
        sideOffset={5}
      >
        {getMessageState(state).displayText ?? "An unknown error occurred"};
        <TooltipArrow className="fill-slate-800" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const StatusIcon = ({ state, className, ...otherProps }: StatusIconProps) => {
  const msgState = getMessageState(state);

  const isFailed = msgState.state === 'failed'

  const iconClass = cn(
    className,
    "text-slate-500 dark:text-slate-400 size-5 shrink-0"
  );

  const Icon = msgState.icon;

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

const TimeDisplay = memo(({ date, className }: { date: Date; className?: string }) => (
  <div className={cn("flex items-center gap-2 shrink-0", className)}>
    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
      {date.toLocaleDateString()}
    </span>
    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
      {date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  </div>
));

export const Message = memo(({ lastMsgSameUser, message, sender }: MessageProps) => {
  const { getDevices } = useDeviceStore();

  const isDeviceUser = useMemo(
    () =>
      getDevices()
        .map((device) => device.nodes.get(device.hardware.myNodeNum)?.num)
        .includes(message.from),
    [getDevices, message.from]
  );

  const messageUser = sender?.user;

  const getMessageTextStyles = (state: MessageState) => {
    const msgState = getMessageState(state);
    const isAcknowledged = msgState.state === 'ack'
    const isFailed = msgState.state === 'failed'

    return cn(
      "break-words overflow-hidden",
      isAcknowledged
        ? "text-slate-900 dark:text-white"
        : "text-slate-900 dark:text-slate-400",
      isFailed && "text-red-500 dark:text-red-500",
    );
  };

  const messageTextClass = useMemo(() => getMessageTextStyles(message.state), [message.state]);


  return (
    <div className="flex flex-col w-full px-4 justify-start">
      <div
        className={cn(
          "flex flex-col flex-wrap items-start py-1",
          isDeviceUser && "items-end"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          {!lastMsgSameUser && (
            <div className="flex place-items-center gap-2 mb-1">
              <Avatar text={messageUser?.shortName ?? "UNK"} />
              <div className="flex flex-col">
                <span className="font-medium text-slate-900 dark:text-white truncate">
                  {messageUser?.longName}
                </span>
              </div>
            </div>
          )}
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
});
