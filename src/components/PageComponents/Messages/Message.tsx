import type { MessageWithState } from "@app/core/stores/deviceStore.ts";
import { cn } from "@app/core/utils/cn";
import { Avatar } from "@components/UI/Avatar";
import type { Protobuf } from "@meshtastic/js";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AlertCircle, CheckCircle2, CircleEllipsis } from "lucide-react";

export interface MessageProps {
  lastMsgSameUser: boolean;
  message: MessageWithState;
  sender?: Protobuf.Mesh.NodeInfo;
}

interface StatusTooltipProps {
  state: MessageWithState["state"];
  children: React.ReactNode;
}

const getStatusText = (state: MessageWithState["state"]): string => {
  switch (state) {
    case "ack":
      return "Message delivered";
    case "waiting":
      return "Waiting for delivery";
    default:
      return "Delivery failed";
  }
};

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

const StatusIcon = ({
  state,
  className,
}: { state: MessageWithState["state"]; className?: string }) => {
  const iconClass = cn(
    className,
    "text-gray-500 dark:text-gray-400 w-4 h-4 flex-shrink-0",
  );
  const Icon = (() => {
    switch (state) {
      case "ack":
        return CheckCircle2;
      case "waiting":
        return CircleEllipsis;
      default:
        return AlertCircle;
    }
  })();
  return (
    <StatusTooltip state={state}>
      <Icon className={iconClass} />
    </StatusTooltip>
  );
};

export const Message = ({ lastMsgSameUser, message, sender }: MessageProps) => {
  const messageTextClass = cn(
    "border-l-2 pl-4 break-words min-w-0",
    message.state === "ack"
      ? "text-gray-900 dark:text-white"
      : "text-gray-500 dark:text-gray-400",
    lastMsgSameUser
      ? "border-gray-600 dark:border-gray-700"
      : "border-gray-200 dark:border-gray-600",
  );

  const baseMessageWrapper = cn(
    "ml-12 flex items-start gap-2 w-full max-w-full",
    lastMsgSameUser ? "mt-1" : "mt-4",
    !lastMsgSameUser && "flex-wrap flex-grow",
  );

  const containerClass = cn(
    "px-4 relative",
    lastMsgSameUser ? "mt-0" : "mt-2",
    !lastMsgSameUser && "pt-2",
  );

  return (
    <div className={containerClass}>
      {!lastMsgSameUser && (
        <div className="flex items-center gap-2 mb-2">
          <Avatar text={sender?.user?.shortName ?? "UNK"} />
          <span className="font-medium text-gray-900 dark:text-white">
            {sender?.user?.longName ?? "UNK"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {message.rxTime.toLocaleDateString()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {message.rxTime.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}
      <div className={baseMessageWrapper}>
        <div className="flex-1 min-w-0">
          <div className={messageTextClass}>{message.data}</div>
        </div>
        <StatusIcon state={message.state} className="ml-auto" />
      </div>
    </div>
  );
};
