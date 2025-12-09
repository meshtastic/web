import { NodeAvatar } from "@components/NodeAvatar";
import { MessageBubble } from "@components/PageComponents/Messages/MessageBubble";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput";
import { ScrollArea } from "@components/ui/scroll-area";
import { useBroadcastMessages, useDirectMessages, markConversationAsRead } from "@db/hooks";
import type { Device } from "@core/stores";
import { groupMessagesByDay, toTimestamp } from "@pages/Messages/MessageUtils";
import type { Contact } from "@pages/Messages/index";
import { Hash } from "lucide-react";
import { Fragment, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface ChatPanelProps {
  contact: Contact | null | undefined;
  device: Device;
  showHeader?: boolean;
}

export function ChatPanel({ contact, device, showHeader = true }: ChatPanelProps) {
  const { i18n, t } = useTranslation();

  // Fetch messages for this conversation
  const directMessages = useDirectMessages(
    device.id,
    device.myNodeNum ?? 0,
    contact?.type === "direct" ? contact.id : 0,
    100,
  );

  const broadcastMessages = useBroadcastMessages(
    device.id,
    contact?.type === "channel" ? contact.id : -1,
    100,
  );

  // Get messages for the selected contact from database
  const currentMessages = useMemo(() => {
    if (!contact || !device.myNodeNum) {
      return [];
    }

    if (contact.type === "channel") {
      return broadcastMessages.messages;
    }

    return directMessages.messages;
  }, [
    contact,
    directMessages.messages,
    broadcastMessages.messages,
    device.myNodeNum,
  ]);

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

  // Sort messages by date and group by day (oldest first)
  const sortedMessages = useMemo(
    () =>
      [...currentMessages].sort(
        (a, b) => toTimestamp(a.date) - toTimestamp(b.date),
      ),
    [currentMessages],
  );

  const messageGroups = useMemo(
    () => groupMessagesByDay(sortedMessages, t, dayLabelFmt),
    [sortedMessages, t, dayLabelFmt],
  );

  // Mark conversation as read when messages are displayed
  useEffect(() => {
    if (!contact || !device.myNodeNum || sortedMessages.length === 0) {
      return;
    }

    const lastMessage = sortedMessages[sortedMessages.length - 1];
    if (!lastMessage) return;

    if (contact.type === "channel") {
      markConversationAsRead(
        device.id,
        "broadcast",
        contact.id.toString(),
        lastMessage.id,
      );
    } else {
      const nodeA = device.myNodeNum;
      const nodeB = contact.nodeNum ?? contact.id;
      const conversationId = nodeA < nodeB ? `${nodeA}:${nodeB}` : `${nodeB}:${nodeA}`;
      markConversationAsRead(
        device.id,
        "direct",
        conversationId,
        lastMessage.id,
      );
    }
  }, [contact, sortedMessages, device.id, device.myNodeNum]);

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-chart-2" />
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

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col px-4">
          {messageGroups.map((group) => (
            <Fragment key={group.dayKey}>
              <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 py-2">
                <div className="text-center">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>
              </div>
              {group.items.map((message) => (
                <MessageBubble
                  key={message.messageId}
                  message={message}
                  myNodeNum={device.myNodeNum}
                  isMine={message.fromNode === device.myNodeNum}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput selectedContact={contact} device={device} />
    </div>
  );
}
