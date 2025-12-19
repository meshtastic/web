import { OnlineIndicator } from "@shared/components/generic/OnlineIndicator";
import { NodeAvatar } from "@components/NodeAvatar";
import { MessageBubble } from "@components/PageComponents/Messages/MessageBubble";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import type { Device } from "@core/stores";
import {
  markConversationAsRead,
  useChannelMessages,
  useDirectMessages,
  useNodes,
} from "@data/hooks";
import type { Contact } from "@pages/Messages/index";
import { groupMessagesByDay, toTimestamp } from "@pages/Messages/MessageUtils";
import { Hash } from "lucide-react";
import { Fragment, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface ChatPanelProps {
  contact: Contact | null | undefined;
  device: Device;
  showHeader?: boolean;
}

export function ChatPanel({
  contact,
  device,
  showHeader = true,
}: ChatPanelProps) {
  const { i18n, t } = useTranslation();
  const myNodeNum = device.getMyNodeNum();

  const { nodeMap } = useNodes(device.id);

  const directMessages = useDirectMessages(
    device.id,
    myNodeNum ?? 0,
    contact?.type === "direct" ? contact.id : 0,
    100,
  );

  const channelMessages = useChannelMessages(
    device.id,
    contact?.type === "channel" ? contact.id : -1,
    100,
  );

  // Get messages for the selected contact from database
  const currentMessages = useMemo(() => {
    if (!contact || !myNodeNum) {
      return [];
    }

    if (contact.type === "channel") {
      return channelMessages.messages;
    }

    return directMessages.messages;
  }, [contact, directMessages.messages, channelMessages.messages, myNodeNum]);

  // Locale and date formatting for message grouping
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
        device.id,
        "channel",
        contact.id.toString(),
        newestMessage.id,
      );
    } else {
      // Conversation ID format: myNodeNum:otherNodeNum (from user's perspective)
      const otherNode = contact.nodeNum ?? contact.id;
      markConversationAsRead(
        device.id,
        "direct",
        `${myNodeNum}:${otherNode}`,
        newestMessage.id,
      );
    }
  }, [contact, sortedMessages, device.id, myNodeNum]);

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
        {/* Chat Header */}
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

        {/* Messages Area - flex-col-reverse makes scroll start at bottom showing newest messages */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse px-3 xl:px-6 xl:pb-14 lg:pb-10 styled-scrollbar">
            {messageGroups.map((group) => (
              <Fragment key={group.dayKey}>
                <div className="sticky top-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10 py-2">
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {group.label}
                    </span>
                  </div>
                </div>
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
              </Fragment>
            ))}
        </div>

        {/* Message Input */}
        <MessageInput selectedContact={contact} device={device} />
      </div>
    </TooltipProvider>
  );
}
