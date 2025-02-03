import type { MessageWithState } from "@app/core/stores/deviceStore.ts";
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

const StatusIcon = ({ state }: { state: MessageWithState["state"] }) => {
  const iconClass = "text-gray-500 dark:text-gray-400 w-4 h-4";
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
  const messageTextClass =
    message.state === "ack"
      ? "text-gray-900 dark:text-white"
      : "text-gray-500 dark:text-gray-400";

  if (lastMsgSameUser) {
    return (
      <div className="mx-4 mt-2">
        <div className="ml-12 flex items-start gap-2">
          <div
            className={`${messageTextClass} border-l-2 border-gray-200 dark:border-gray-700 pl-4 flex-grow`}
          >
            {message.data}
          </div>
          <StatusIcon state={message.state} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-2 space-y-2">
      <div className="flex items-center gap-2">
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
      <div className="ml-12 flex items-start gap-2">
        <div
          className={`${messageTextClass} border-l-2 border-gray-200 dark:border-gray-700 pl-4 flex-grow`}
        >
          {message.data}
        </div>
        <StatusIcon state={message.state} />
      </div>
    </div>
  );
};
