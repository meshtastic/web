import type { MessageWithState } from "@app/core/stores/deviceStore.ts";
import { cn } from "@app/core/utils/cn";
import { Avatar } from "@components/UI/Avatar";
import type { Protobuf } from "@meshtastic/js";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AlertCircle, CheckCircle2, CircleEllipsis } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MESSAGE_STATES = {
  ACK: "ack",
  WAITING: "waiting",
  FAILED: "failed",
} as const;

type MessageState = MessageWithState["state"];

interface MessageProps {
  lastMsgSameUser: boolean;
  message: MessageWithState;
  sender?: Protobuf.Mesh.NodeInfo;
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
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95"
          side="top"
          align="center"
          sideOffset={5}
        >
          {getStatusText(state)}
          <Tooltip.Arrow className="fill-slate-800" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
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
    "pl-2 break-words overflow-hidden",
    isAcknowledged
      ? "text-black dark:text-white"
      : "text-black dark:text-gray-400",
    isFailed && "text-red-500 dark:text-red-500",
  );
};

const TimeDisplay = ({ date }: { date: Date }) => (
  <div className="flex items-center gap-2 flex-shrink-0">
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
  const messageTextClass = getMessageTextStyles(message.state);
  const isFailed = message.state === MESSAGE_STATES.ACK;

  const baseMessageWrapper = cn(
    "flex items-center gap-2 w-full max-w-full pl-11",
    !lastMsgSameUser && "flex-wrap flex-grow",
  );

  const containerClass = cn(
    "w-full px-4 relative",
    lastMsgSameUser ? "mt-1" : "mt-2",
    !lastMsgSameUser && "pt-2",
  );

  return (
    <div className={containerClass}>
      {!lastMsgSameUser && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              text={sender?.user?.shortName ?? "UNK"}
              className="flex-shrink-0"
            />
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {sender?.user?.longName ?? "UNK"}
            </span>
          </div>
          <TimeDisplay date={message.rxTime} />
        </div>
      )}
      <div className={baseMessageWrapper}>
        <div className="flex-1 min-w-0 max-w-full">
          <div className={messageTextClass}>{message.data}</div>
        </div>
        <StatusIcon
          state={message.state}
          className="ml-auto mr-6 flex-shrink-0"
        />
      </div>
    </div>
  );
};
