import { Avatar } from "@components/UI/Avatar.tsx";
import {
  useMyNodeAsProto,
  useNodeAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { useAppStore, useDevice } from "@core/stores";
import type { Message } from "@core/stores/messageStore";
import { cn } from "@core/utils/cn.ts";
import type { Protobuf } from "@meshtastic/sdk";
import { useMemo } from "react";
import { MessageDiagnostics } from "./MessageDiagnostics.tsx";
import { MessageStatus } from "./MessageStatus.tsx";
import { useTranslation } from "react-i18next";

const myNodePromises = new Map<string, Promise<void>>();
const myNodeDeadlines = new Map<string, number>();
const MY_NODE_TIMEOUT_MS = 10_000;

// Suspends until myNode hydrates. Times out after 10s.
function useSuspendingMyNode() {
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);
  const myNode = useMyNodeAsProto();

  if (myNode) {
    const deviceKey = `device-${selectedDeviceId}`;
    myNodePromises.delete(deviceKey);
    myNodeDeadlines.delete(deviceKey);
    return myNode;
  }

  const deviceKey = `device-${selectedDeviceId}`;
  const deadline =
    myNodeDeadlines.get(deviceKey) ?? Date.now() + MY_NODE_TIMEOUT_MS;
  myNodeDeadlines.set(deviceKey, deadline);

  if (Date.now() > deadline) {
    myNodePromises.delete(deviceKey);
    myNodeDeadlines.delete(deviceKey);
    throw new Error("myNode not available after 10s");
  }

  if (!myNodePromises.has(deviceKey)) {
    myNodePromises.set(
      deviceKey,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          myNodePromises.delete(deviceKey);
          resolve();
        }, 100);
      }),
    );
  }

  throw myNodePromises.get(deviceKey);
}

// import { MessageActionsMenu } from "@components/PageComponents/Messages/MessageActionsMenu.tsx"; // TODO: Uncomment when actions menu is implemented

interface MessageItemProps {
  message: Message;
}

export const MessageItem = ({ message }: MessageItemProps) => {
  const { config } = useDevice();
  const { t, i18n } = useTranslation("messages");
  const messageUserNode = useNodeAsProto(message.from ?? 0);

  // This will suspend if myNode is not available yet
  const myNode = useSuspendingMyNode();
  const myNodeNum = myNode.num;

  const messageUser: Protobuf.Mesh.NodeInfo | null | undefined =
    message.from != null ? (messageUserNode ?? null) : null;

  const { displayName, isFavorite, nodeNum } = useMemo(() => {
    const fromNum = message.from ?? 0;
    const userIdHex = fromNum.toString(16).toUpperCase().padStart(2, "0");
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
      nodeNum: fromNum,
    };
  }, [messageUser, message.from, t, myNodeNum]);

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

          {isSender ? (
            <MessageStatus message={message} />
          ) : (
            <MessageDiagnostics message={message} lora={config?.lora} />
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
