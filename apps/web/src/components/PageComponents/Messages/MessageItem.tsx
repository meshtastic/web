import { Avatar } from "@components/UI/Avatar.tsx";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { Button } from "@components/UI/Button.tsx";
import {
  useMyNodeAsProto,
  useNodeAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { useAppStore, useDevice } from "@core/stores";
import { type Message } from "@core/stores/messageStore";
import { cn } from "@core/utils/cn.ts";
import { type Protobuf } from "@meshtastic/sdk";
import { RotateCcw } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  getMessageDeliveryStatusInfo,
  type MessageDeliveryStatusInfo,
} from "./messageDeliveryStatus.ts";

// Cache for pending promises
const myNodePromises = new Map<string, Promise<Protobuf.Mesh.NodeInfo>>();

// Hook that suspends when myNode is not available. Reads from the SDK
// (NodesClient signal hydrated by sqlocal + live packets) instead of the
// legacy Zustand nodeDB. The polling fallback remains because there is a
// gap between mount and first onMyNodeInfo packet on a fresh connect.
function useSuspendingMyNode() {
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);
  const myNode = useMyNodeAsProto();

  if (!myNode) {
    const deviceKey = `device-${selectedDeviceId}`;

    if (!myNodePromises.has(deviceKey)) {
      const promise = new Promise<Protobuf.Mesh.NodeInfo>((resolve, reject) => {
        // setTimeout with a 100ms tick lets React re-render this component
        // (and therefore re-run the hook) until myNode resolves through the
        // SDK signal. Suspense re-throws the promise on each retry until
        // the value is available.
        const start = Date.now();
        const tick = () => {
          if (Date.now() - start > 10000) {
            myNodePromises.delete(deviceKey);
            reject(new Error("myNode not available after 10s"));
            return;
          }
          // Resolve a no-op promise to retrigger the Suspense boundary;
          // the next render will call useMyNodeAsProto again.
          resolve({} as Protobuf.Mesh.NodeInfo);
          myNodePromises.delete(deviceKey);
        };
        setTimeout(tick, 100);
      });

      myNodePromises.set(deviceKey, promise);
    }

    throw myNodePromises.get(deviceKey);
  }

  return myNode;
}

// import { MessageActionsMenu } from "@components/PageComponents/Messages/MessageActionsMenu.tsx"; // TODO: Uncomment when actions menu is implemented

const StatusTooltip = ({
  statusInfo,
  children,
}: {
  statusInfo: MessageDeliveryStatusInfo;
  children: ReactNode;
}) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
        {statusInfo.detailText}
        <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface MessageItemProps {
  message: Message;
  onRetry?: (message: Message) => void;
}

export const MessageItem = ({ message, onRetry }: MessageItemProps) => {
  const { config } = useDevice();
  const { t, i18n } = useTranslation("messages");
  const messageUserNode = useNodeAsProto(message.from ?? 0);

  // This will suspend if myNode is not available yet
  const myNode = useSuspendingMyNode();
  const myNodeNum = myNode.num;

  const messageUser: Protobuf.Mesh.NodeInfo | null | undefined =
    message.from != null ? (messageUserNode ?? null) : null;

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

  const messageStatusInfo = useMemo(
    () => getMessageDeliveryStatusInfo(message, t),
    [message, t],
  );
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
  const shouldShowStatus = isSender;
  const canRetry =
    shouldShowStatus && messageStatusInfo.canRetry && Boolean(onRetry);

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
          </div>

          {message?.message && (
            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
              {message.message}
            </div>
          )}

          {shouldShowStatus && (
            <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <StatusTooltip statusInfo={messageStatusInfo}>
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    messageStatusInfo.textClassName,
                  )}
                  aria-label={messageStatusInfo.ariaLabel}
                >
                  <StatusIconComponent
                    className={cn(
                      "size-3.5 shrink-0",
                      messageStatusInfo.iconClassName,
                    )}
                    aria-hidden="true"
                  />
                  <span>{messageStatusInfo.displayText}</span>
                </span>
              </StatusTooltip>
              {canRetry && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-xs text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                  onClick={() => onRetry?.(message)}
                  aria-label={t("deliveryStatus.retryAriaLabel", {
                    status: messageStatusInfo.displayText,
                  })}
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  {t("deliveryStatus.retry")}
                </Button>
              )}
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
