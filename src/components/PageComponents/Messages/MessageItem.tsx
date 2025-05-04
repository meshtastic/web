import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { cn } from "@core/utils/cn.ts";
import { Avatar } from "@components/UI/Avatar.tsx";
import { AlertCircle, CheckCircle2, CircleEllipsis } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReactNode, useMemo } from "react";
import {
  MessageState,
  useMessageStore,
} from "@core/stores/messageStore/index.ts";
import { Protobuf, Types } from "@meshtastic/js";
import { Message } from "@core/stores/messageStore/types.ts";
// import { MessageActionsMenu } from "@components/PageComponents/Messages/MessageActionsMenu.tsx"; // Uncomment if needed later

interface MessageStatusInfo {
  displayText: string;
  icon: LucideIcon;
  ariaLabel: string;
  iconClassName?: string;
}

const MESSAGE_STATUS_MAP: Record<MessageState, MessageStatusInfo> = {
  [MessageState.Ack]: {
    displayText: "Message delivered",
    icon: CheckCircle2,
    ariaLabel: "Message delivered",
    iconClassName: "text-green-500",
  },
  [MessageState.Waiting]: {
    displayText: "Waiting for delivery",
    icon: CircleEllipsis,
    ariaLabel: "Sending message",
    iconClassName: "text-slate-400",
  },
  [MessageState.Failed]: {
    displayText: "Delivery failed",
    icon: AlertCircle,
    ariaLabel: "Message delivery failed",
    iconClassName: "text-red-500 dark:text-red-400",
  },
};

const UNKNOWN_STATUS: MessageStatusInfo = {
  displayText: "Unknown state",
  icon: AlertCircle,
  ariaLabel: "Message status unknown",
  iconClassName: "text-red-500 dark:text-red-400",
};

const getMessageStatusInfo = (state: MessageState): MessageStatusInfo =>
  MESSAGE_STATUS_MAP[state] ?? UNKNOWN_STATUS;

const StatusTooltip = (
  { statusInfo, children }: {
    statusInfo: MessageStatusInfo;
    children: ReactNode;
  },
) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
        {statusInfo.displayText}
        <TooltipArrow className="fill-slate-800" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface MessageItemProps {
  message: Message;
}

export const MessageItem = ({ message }: MessageItemProps) => {
  const { getNode } = useDevice();
  const { getMyNodeNum } = useMessageStore();

  const messageUser: Protobuf.Mesh.NodeInfo | null | undefined = useMemo(() => {
    return message.from != null ? getNode(message.from) : null;
  }, [getNode, message.from]);

  const myNodeNum = useMemo(() => getMyNodeNum(), [getMyNodeNum]);
  const { displayName, shortName } = useMemo(() => {
    const userIdHex = message.from.toString(16).toUpperCase().padStart(2, "0");
    const last4 = userIdHex.slice(-4);
    const fallbackName = `Meshtastic ${last4}`;
    const longName = messageUser?.user?.longName;
    const derivedShortName = messageUser?.user?.shortName || fallbackName;
    const derivedDisplayName = longName || derivedShortName;
    return { displayName: derivedDisplayName, shortName: derivedShortName };
  }, [messageUser, message.from]);

  const messageStatusInfo = getMessageStatusInfo(message.state);
  const StatusIconComponent = messageStatusInfo.icon;

  const messageDate = useMemo(
    () => message.date ? new Date(message.date) : null,
    [message.date],
  );
  const locale = "en-US"; // TODO: Make dynamic via props or context

  const formattedTime = useMemo(
    () =>
      messageDate?.toLocaleTimeString(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) ?? "",
    [messageDate, locale],
  );

  const fullDateTime = useMemo(
    () =>
      messageDate?.toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }) ?? "",
    [messageDate, locale],
  );

  const isSender = myNodeNum !== undefined && message.from === myNodeNum;
  const isOnPrimaryChannel = message.channel === Types.ChannelNumber.Primary; // Use the enum
  const shouldShowStatusIcon = isSender && isOnPrimaryChannel;

  const messageItemWrapperClass = cn(
    "group w-full py-2 relative list-none",
    "rounded-md",
    "hover:bg-slate-300/15 dark:hover:bg-slate-600/20",
    "transition-colors duration-100 ease-in-out",
  );
  const dateTextStyle = "text-xs text-slate-500 dark:text-slate-400";

  return (
    <li className={messageItemWrapperClass}>
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <Avatar size="sm" text={shortName} className="pt-0.5" />

        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate mr-1">
              {displayName}
            </span>
            {messageDate && (
              <time
                dateTime={messageDate.toISOString()}
                className={dateTextStyle}
              >
                <span aria-hidden="true">{formattedTime}</span>
                <span className="sr-only">{fullDateTime}</span>
              </time>
            )}
            {shouldShowStatusIcon && (
              <StatusTooltip statusInfo={messageStatusInfo}>
                <span aria-label={messageStatusInfo.ariaLabel} role="img">
                  <StatusIconComponent
                    className={cn(
                      "size-4 shrink-0",
                      messageStatusInfo.iconClassName,
                    )}
                    aria-hidden="true"
                  />
                </span>
              </StatusTooltip>
            )}
          </div>

          {message?.message && (
            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
              {message.message}
            </div>
          )}
        </div>
      </div>
      {/* Actions Menu Placeholder */}
      {
        /* <div className="absolute top-1 right-1">
        <MessageActionsMenu onReply={() => console.log("Reply")} />
       </div> */
      }
    </li>
  );
};
