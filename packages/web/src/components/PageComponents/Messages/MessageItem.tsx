import { Avatar } from "@components/UI/Avatar.tsx";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { MessageState, useAppStore, useDevice, useNodeDB } from "@core/stores";
import type { Message } from "@core/stores/messageStore/types.ts";
import { cn } from "@core/utils/cn.ts";
import { type Protobuf, Types } from "@meshtastic/core";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, CircleEllipsis } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

// Cache for pending promises
const myNodePromises = new Map<string, Promise<Protobuf.Mesh.NodeInfo>>();

// Hook that suspends when myNode is not available
function useSuspendingMyNode() {
  const { getMyNode } = useNodeDB();
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);
  const myNode = getMyNode();

  if (!myNode) {
    // Use the selected device ID to cache promises per device
    const deviceKey = `device-${selectedDeviceId}`;

    if (!myNodePromises.has(deviceKey)) {
      const promise = new Promise<Protobuf.Mesh.NodeInfo>((resolve) => {
        // Poll for myNode to become available
        const checkInterval = setInterval(() => {
          const node = getMyNode();
          if (node) {
            console.log(
              "[MessageItem] myNode now available, resolving promise",
            );
            clearInterval(checkInterval);
            myNodePromises.delete(deviceKey);
            resolve(node);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          myNodePromises.delete(deviceKey);
        }, 10000);
      });

      myNodePromises.set(deviceKey, promise);
    }

    // Throw the promise to trigger Suspense
    throw myNodePromises.get(deviceKey);
  }

  return myNode;
}

// import { MessageActionsMenu } from "@components/PageComponents/Messages/MessageActionsMenu.tsx"; // TODO: Uncomment when actions menu is implemented

interface MessageStatusInfo {
  displayText: string;
  icon: LucideIcon;
  ariaLabel: string;
  iconClassName?: string;
}

const StatusTooltip = ({
  statusInfo,
  children,
}: {
  statusInfo: MessageStatusInfo;
  children: ReactNode;
}) => (
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
  const { config } = useDevice();
  const { getNode } = useNodeDB();
  const { t, i18n } = useTranslation("messages");

  // This will suspend if myNode is not available yet
  const myNode = useSuspendingMyNode();
  const myNodeNum = myNode.num;

  const MESSAGE_STATUS_MAP = useMemo(
    (): Record<MessageState, MessageStatusInfo> => ({
      [MessageState.Ack]: {
        displayText: t("deliveryStatus.delivered.displayText"),
        icon: CheckCircle2,
        ariaLabel: t("deliveryStatus.delivered.label"),
        iconClassName: "text-green-500",
      },
      [MessageState.Waiting]: {
        displayText: t("deliveryStatus.waiting.displayText"),
        icon: CircleEllipsis,
        ariaLabel: t("deliveryStatus.waiting.label"),
        iconClassName: "text-slate-400",
      },
      [MessageState.Failed]: {
        displayText: t("deliveryStatus.failed.displayText"),
        icon: AlertCircle,
        ariaLabel: t("deliveryStatus.failed.label"),
        iconClassName: "text-red-500 dark:text-red-400",
      },
    }),
    [t],
  );

  const UNKNOWN_STATUS = useMemo(
    (): MessageStatusInfo => ({
      displayText: t("deliveryStatus.unknown.displayText"),
      icon: AlertCircle,
      ariaLabel: t("deliveryStatus.unknown.label"),
      iconClassName: "text-red-500 dark:text-red-400",
    }),
    [t],
  );

  const getMessageStatusInfo = useMemo(
    () =>
      (state: MessageState): MessageStatusInfo =>
        MESSAGE_STATUS_MAP[state] ?? UNKNOWN_STATUS,
    [MESSAGE_STATUS_MAP, UNKNOWN_STATUS],
  );

  const messageUser: Protobuf.Mesh.NodeInfo | null | undefined = useMemo(() => {
    return message.from != null ? getNode(message.from) : null;
  }, [getNode, message.from]);

  const { displayName, isFavorite, nodeNum } = useMemo(() => {
    const userIdHex = message.from.toString(16).toUpperCase().padStart(2, "0");
    const last4 = userIdHex.slice(-4);
    const fallbackName = t("fallbackName", { last4 });
    const longName = messageUser?.user?.longName;
    const derivedShortName = messageUser?.user?.shortName || fallbackName;
    const derivedDisplayName = longName || derivedShortName;
    const isFavorite =
      messageUser?.num !== myNodeNum && messageUser?.isFavorite;
    return {
      displayName: derivedDisplayName,
      shortName: derivedShortName,
      isFavorite: isFavorite,
      nodeNum: message.from,
    };
  }, [messageUser, message.from, t, myNodeNum]);

  const messageStatusInfo = getMessageStatusInfo(message.state);
  const StatusIconComponent = messageStatusInfo.icon;

  const messageDate = useMemo(
    () => (message.date ? new Date(message.date) : null),
    [message.date],
  );
  const locale = i18n.language;

  const formattedTime = useMemo(
    () =>
      messageDate?.toLocaleTimeString(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: config?.display?.use12hClock ?? true,
      }) ?? "",
    [messageDate, locale, config?.display?.use12hClock],
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
        <Avatar
          size="sm"
          nodeNum={nodeNum}
          className="pt-0.5"
          showFavorite={isFavorite}
        />

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
      {/* <div className="absolute top-1 right-1">
        <MessageActionsMenu onReply={() => console.log("Reply")} />
       </div> */}
    </li>
  );
};
