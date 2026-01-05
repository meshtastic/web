import logger from "@core/services/logger";
import {
  markConversationAsRead,
  useChannelMessages,
  useDirectMessages,
  useNodes,
} from "@data/hooks";
import { NodeAvatar } from "@shared/components/NodeAvatar.tsx";
import { OnlineIndicator } from "@shared/components/OnlineIndicator.tsx";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { useMyNode } from "@shared/hooks";
import { Hash } from "lucide-react";
import { Fragment, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Contact } from "../pages/MessagesPage.tsx";
import { MessageBubble } from "./MessageBubble.tsx";
import { MessageInput } from "./MessageInput.tsx";
import { groupMessagesByDay, toTimestamp } from "./MessageUtils.tsx";

interface ChatPanelProps {
  contact: Contact | null | undefined;
  showHeader?: boolean;
}

export function ChatPanel({ contact, showHeader = true }: ChatPanelProps) {
  const { i18n, t } = useTranslation();
  const { myNodeNum } = useMyNode();

  const { nodeMap } = useNodes(myNodeNum);

  const directMessages = useDirectMessages(
    myNodeNum,
    myNodeNum,
    contact?.type === "direct" ? contact.id : 0,
    100,
  );

  const channelMessages = useChannelMessages(
    myNodeNum,
    contact?.type === "channel" ? contact.id : -1,
    100,
  );

  const currentMessages = useMemo(() => {
    if (!contact || !myNodeNum) {
      return [];
    }

    if (contact.type === "channel") {
      return channelMessages.messages;
    }

    return directMessages.messages;
  }, [contact, directMessages.messages, channelMessages.messages, myNodeNum]);

  const locale = useMemo(
    () =>
      i18n.language ||
      (typeof navigator !== "undefined" ? navigator.language : "en-US"),
    [i18n.language],
  );

  const dayLabelFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [locale],
  );

  // Sort messages newest-first (flex-col-reverse will display oldest at top, newest at bottom)
  const sortedMessages = useMemo(
    () =>
      [...currentMessages].sort(
        (a, b) => toTimestamp(b.date) - toTimestamp(a.date),
      ),
    [currentMessages],
  );

  const messageGroups = useMemo(
    () => groupMessagesByDay(sortedMessages, t, dayLabelFmt),
    [sortedMessages, t, dayLabelFmt],
  );

  // Mark conversation as read when messages are displayed
  useEffect(() => {
    if (!contact || !myNodeNum || sortedMessages.length === 0) {
      return;
    }

    // sortedMessages is newest-first, so index 0 is the most recent message
    const newestMessage = sortedMessages[0];
    if (!newestMessage) {
      return;
    }

    if (contact.type === "channel") {
      markConversationAsRead(
        myNodeNum,
        "channel",
        contact.id.toString(),
        newestMessage.id,
      );
    } else {
      // Conversation ID format: myNodeNum:otherNodeNum (from user's perspective)
      const otherNode = contact.nodeNum ?? contact.id;
      markConversationAsRead(
        myNodeNum,
        "direct",
        `${myNodeNum}:${otherNode}`,
        newestMessage.id,
      );
    }
  }, [contact, sortedMessages, myNodeNum]);

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full min-h-0">
        {showHeader && (
          <div className="h-14 border-b flex items-center px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                {contact.type === "channel" ? (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Hash className="h-4 w-4 text-primary" />
                  </div>
                ) : (
                  <NodeAvatar
                    nodeNum={contact.nodeNum || contact.id}
                    longName={contact.name}
                    size="xs"
                    showFavorite={contact.isFavorite}
                  />
                )}
                {contact.online && contact.type === "direct" && (
                  <OnlineIndicator className="absolute bottom-0 right-0 h-2.5 w-2.5" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-sm">{contact.name}</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {contact.nodeId}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse px-3 xl:px-6 xl:pb-14 lg:pb-10 styled-scrollbar">
          {messageGroups.map((group) => (
            <Fragment key={group.dayKey}>
              <div className="flex flex-col-reverse gap-3">
                {group.items.map((message) => {
                  const senderNode = nodeMap.get(message.fromNode);
                  const senderName = senderNode?.longName ?? undefined;

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      myNodeNum={myNodeNum}
                      senderName={senderName}
                      isMine={message.fromNode === myNodeNum}
                    />
                  );
                })}
              </div>
              <div className="sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 py-2">
                <div className="text-center">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>
              </div>
            </Fragment>
          ))}
        </div>

        <MessageInput selectedContact={contact} />
      </div>
    </TooltipProvider>
  );
}
