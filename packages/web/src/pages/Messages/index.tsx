import { NodeAvatar } from "@components/NodeAvatar";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { ScrollArea } from "@components/ui/scroll-area";
import {
  MessageState,
  MessageType,
  useDevice,
  useMessages,
  useNodeDB,
} from "@core/stores";
import { getAvatarColors } from "@core/utils/avatarColors";
import { cn } from "@core/utils/cn";
import type { Types } from "@meshtastic/core";
import {
  DateDelimiter,
  groupMessagesByDay,
  toTimestamp,
} from "@pages/Messages/MessageUtils";
import {
  ArrowUp,
  Hash,
  MoreVertical,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Contact = {
  id: number;
  name: string;
  nodeId: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  type: "direct" | "channel";
  nodeNum?: number;
};

type Tab = {
  id: number;
  contactId: number;
};

const MAX_MESSAGE_BYTES = 200;

export default function MessagesPage() {
  const device = useDevice();
  const nodeDB = useNodeDB();
  const messages = useMessages();
  const { i18n, t } = useTranslation();

  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<
    "all" | "direct" | "channels"
  >("all");

  // Message input state per tab
  const [messageDrafts, setMessageDrafts] = useState<Record<number, string>>(
    {},
  );
  const [messageBytes, setMessageBytes] = useState<Record<number, number>>({});

  // Get contacts from nodeDB and channels
  const contacts = useMemo<Contact[]>(() => {
    const contactsList: Contact[] = [];

    // Add nodes from nodeDB
    const nodes = nodeDB.getNodes(undefined, true); // include self
    nodes.forEach((node) => {
      const name =
        node.user?.longName || node.user?.shortName || `Node ${node.num}`;
      contactsList.push({
        id: node.num,
        name,
        nodeId: `!${node.num.toString(16)}`,
        lastMessage: "",
        time: "",
        unread: 0,
        online: (node.lastHeard || 0) > Date.now() / 1000 - 900, // Online if heard in last 15 min
        type: "direct",
        nodeNum: node.num,
      });
    });

    // Add channels from device (at the top of the list)
    if (device?.channels) {
      const channels = Array.from(device.channels.values());
      channels.forEach((channel) => {
        // Only show channels that have a name or are the primary channel
        if (
          channel?.index !== undefined &&
          (channel.settings?.name || channel.index === 0)
        ) {
          const name =
            channel.settings?.name ||
            (channel.index === 0 ? "Primary" : `Channel ${channel.index}`);
          contactsList.unshift({
            id: channel.index, // Use channel index directly
            name,
            nodeId: `#${channel.index}`,
            lastMessage: "",
            time: "",
            unread: 0,
            online: true,
            type: "channel",
          });
        }
      });
    }

    return contactsList;
  }, [nodeDB, device.channels]);

  // Open Primary channel when contacts are loaded
  useEffect(() => {
    if (openTabs.length === 0 && contacts.length > 0) {
      const primaryChannel = contacts.find(
        (c) => c.type === "channel" && c.nodeId === "#0",
      );
      if (primaryChannel) {
        setOpenTabs([{ id: 1, contactId: primaryChannel.id }]);
        setActiveTabId(1);
      }
    }
  }, [contacts, openTabs.length]);

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const selectedContact = activeTab
    ? contacts.find((c) => c.id === activeTab.contactId)
    : null;

  // Mark conversation as read when it becomes active
  useEffect(() => {
    if (!selectedContact || !device.myNodeNum) {
      return;
    }

    if (selectedContact.type === "channel") {
      messages.markConversationAsRead({
        type: MessageType.Broadcast,
        channelId: selectedContact.id as Types.ChannelNumber,
      });
    } else if (selectedContact.nodeNum) {
      messages.markConversationAsRead({
        type: MessageType.Direct,
        nodeA: device.myNodeNum,
        nodeB: selectedContact.nodeNum,
      });
    }
  }, [device.myNodeNum, messages.markConversationAsRead, selectedContact]);

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.nodeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      contactFilter === "all" ||
      (contactFilter === "direct" && contact.type === "direct") ||
      (contactFilter === "channels" && contact.type === "channel");
    return matchesSearch && matchesFilter;
  });

  const openChat = (contactId: number) => {
    const existingTab = openTabs.find((t) => t.contactId === contactId);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const newTabId = Math.max(...openTabs.map((t) => t.id), 0) + 1;
      setOpenTabs([...openTabs, { id: newTabId, contactId }]);
      setActiveTabId(newTabId);

      // Initialize draft for this contact if not exists
      if (!messageDrafts[contactId]) {
        setMessageDrafts((prev) => ({ ...prev, [contactId]: "" }));
        setMessageBytes((prev) => ({ ...prev, [contactId]: 0 }));
      }
    }
  };

  const closeTab = (tabId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openTabs.length === 1) {
      return;
    }

    const newTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(newTabs);

    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const calculateBytes = (text: string) => new Blob([text]).size;

  const handleMessageChange = (contactId: number, text: string) => {
    const byteLength = calculateBytes(text);
    if (byteLength <= MAX_MESSAGE_BYTES) {
      setMessageDrafts((prev) => ({ ...prev, [contactId]: text }));
      setMessageBytes((prev) => ({ ...prev, [contactId]: byteLength }));
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !device.connection) {
      console.log("[sendMessage] Missing selectedContact or device.connection");
      return;
    }

    const draft = messageDrafts[selectedContact.id] || "";
    const trimmedMessage = draft.trim();

    if (!trimmedMessage) {
      return;
    }

    const isDirect = selectedContact.type === "direct";
    const isBroadcast = selectedContact.type === "channel";

    // Determine destination and channel based on contact type
    // For broadcast: use "broadcast" string
    // For direct: use the node number
    const toValue = isDirect
      ? (selectedContact.nodeNum as number)
      : ("broadcast" as const);

    // For channels, use  the contact ID
    // For direct messages, don't specify a channel
    const channelValue = isDirect
      ? undefined
      : (selectedContact.id as Types.ChannelNumber);

    console.log("[sendMessage] Sending:", {
      message: trimmedMessage,
      isDirect,
      isBroadcast,
      toValue,
      channelValue,
      selectedContact: selectedContact.name,
      nodeNum: selectedContact.nodeNum,
    });

    setMessageDrafts((prev) => ({ ...prev, [selectedContact.id]: "" }));
    setMessageBytes((prev) => ({ ...prev, [selectedContact.id]: 0 }));

    try {
      const messageId = await device.connection.sendText(
        trimmedMessage,
        toValue,
        true,
        channelValue,
      );

      console.log("[sendMessage] Message sent, ID:", messageId);

      if (messageId !== undefined) {
        if (isBroadcast) {
          messages.setMessageState({
            type: MessageType.Broadcast,
            channelId: channelValue,
            messageId,
            newState: MessageState.Ack,
          });
        } else {
          messages.setMessageState({
            type: MessageType.Direct,
            nodeA: device.myNodeNum as number,
            nodeB: selectedContact.nodeNum as number,
            messageId,
            newState: MessageState.Ack,
          });
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // TODO: Handle failed message state
    }
  };

  // Get messages for the selected contact
  const currentMessages = useMemo(() => {
    if (!selectedContact || !device.myNodeNum) {
      return [];
    }

    if (selectedContact.type === "channel") {
      return messages.getMessages({
        type: MessageType.Broadcast,
        channelId: selectedContact.id as Types.ChannelNumber,
      });
    }

    // For direct messages, check if nodeNum exists
    if (!selectedContact.nodeNum) {
      return [];
    }

    return messages.getMessages({
      type: MessageType.Direct,
      nodeA: device.myNodeNum,
      nodeB: selectedContact.nodeNum,
    });
  }, [selectedContact, messages, device.myNodeNum]);

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

  // Sort messages by date and group by day
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

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Contacts Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              className="pl-9"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant={contactFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setContactFilter("all")}
            >
              All
            </Button>
            <Button
              variant={contactFilter === "direct" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setContactFilter("direct")}
            >
              <Users className="h-3 w-3 mr-1" />
              Direct
            </Button>
            <Button
              variant={contactFilter === "channels" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setContactFilter("channels")}
            >
              <Hash className="h-3 w-3 mr-1" />
              Channels
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredContacts.map((contact) => (
              <button
                type="button"
                key={contact.id}
                onClick={() => openChat(contact.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
                  selectedContact?.id === contact.id
                    ? "bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/50",
                )}
              >
                <div className="relative">
                  {contact.type === "channel" ? (
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <NodeAvatar
                      nodeNum={contact.nodeNum || contact.id}
                      longName={contact.name}
                      size="sm"
                    />
                  )}
                  {contact.online && contact.type === "direct" && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-chart-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className=" font-medium truncate">
                      {contact.name}
                    </span>
                    <span className=" text-xs text-muted-foreground">
                      {contact.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className=" text-sm text-muted-foreground truncate">
                      {contact.lastMessage}
                    </span>
                    {contact.unread > 0 && (
                      <Badge className="h-5 min-w-5 justify-center bg-primary text-primary-foreground">
                        {contact.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b bg-muted/30">
          <div className="flex items-center">
            <ScrollArea className="flex-1">
              <div className="flex">
                {openTabs.map((tab) => {
                  const tabContact = contacts.find(
                    (c) => c.id === tab.contactId,
                  );
                  if (!tabContact) return null;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={cn(
                        "group flex items-center gap-2 px-4 py-2 border-r cursor-pointer transition-colors min-w-[140px] max-w-[200px]",
                        activeTabId === tab.id
                          ? "bg-background border-b-2 border-b-primary"
                          : "hover:bg-muted/50",
                      )}
                    >
                      {tabContact.type === "channel" ? (
                        <Hash className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <div className="relative shrink-0">
                          <div className="h-5 w-5 rounded-full overflow-hidden">
                            <NodeAvatar
                              nodeNum={tabContact.nodeNum || tabContact.id}
                              longName={tabContact.name}
                              size="xs"
                            />
                          </div>
                          {tabContact.online &&
                            tabContact.type === "direct" && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-chart-2" />
                            )}
                        </div>
                      )}
                      <span className="text-sm truncate flex-1 ">
                        {tabContact.name}
                      </span>
                      {openTabs.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => closeTab(tab.id, e)}
                          className="opacity-0 group-hover:opacity-900 hover:bg-muted rounded p-0.5 transition-opacity"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 mx-1"
              onClick={() => {
                // Open the first contact not already in tabs
                const availableContact = contacts.find(
                  (c) => !openTabs.some((t) => t.contactId === c.id),
                );
                if (availableContact) {
                  openChat(availableContact.id);
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {selectedContact.type === "channel" ? (
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <NodeAvatar
                      nodeNum={selectedContact.nodeNum || selectedContact.id}
                      longName={selectedContact.name}
                      size="sm"
                    />
                  )}
                  {selectedContact.online &&
                    selectedContact.type === "direct" && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-chart-2" />
                    )}
                </div>
                <div>
                  <h2 className="font-semibold">{selectedContact.name}</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedContact.nodeId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col-reverse space-y-3 space-y-reverse">
                {messageGroups.map(({ dayKey, label, items }) => (
                  <Fragment key={dayKey}>
                    {/* Render messages first, then delimiter — with flex-col-reverse this shows the delimiter above that day's messages */}
                    {items.map((msg) => {
                      const myNodeNum = device.myNodeNum ?? messages.myNodeNum;
                      const isMine =
                        myNodeNum !== undefined && msg.from === myNodeNum;
                      const senderNode = nodeDB.getNode(msg.from);
                      const senderName =
                        senderNode?.user?.longName ||
                        senderNode?.user?.shortName ||
                        `Node ${msg.from}`;
                      const avatarColors = getAvatarColors(msg.from);

                      return (
                        <div
                          key={msg.messageId}
                          className={cn(
                            "flex gap-2 items-center",
                            isMine
                              ? "justify-end flex-row-reverse"
                              : "justify-start",
                          )}
                        >
                          <NodeAvatar
                            nodeNum={msg.from}
                            longName={senderName}
                            size="sm"
                          />
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-3 py-2",
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-card",
                            )}
                          >
                            {!isMine && (
                              <p
                                className="text-xs font-medium mb-0.5 "
                                style={{ color: avatarColors.bgColor }}
                              >
                                {senderName}
                              </p>
                            )}
                            <p className="text-sm leading-relaxed ">
                              {msg.message}
                            </p>
                            <p
                              className={cn(
                                "text-xs mt-1 ",
                                isMine
                                  ? "text-primary-foreground/60"
                                  : "text-muted-foreground",
                              )}
                            >
                              {new Date(msg.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <DateDelimiter label={label} />
                  </Fragment>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                {/* <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button> */}
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder={`Message ${selectedContact.name}...`}
                    value={messageDrafts[selectedContact.id] || ""}
                    onChange={(e) =>
                      handleMessageChange(selectedContact.id, e.target.value)
                    }
                    className="flex-1"
                  />
                  <span className="flex items-center text-sm text-muted-foreground min-w-[60px] justify-end">
                    {messageBytes[selectedContact.id] || 0}/{MAX_MESSAGE_BYTES}
                  </span>
                </div>
                {/* TODO: ******** uncomment this when emoji picker is added */}
                {/* <Button variant="ghost" size="icon" type="button">
                  <Smile className="h-4 w-4" />
                </Button> */}
                <Button size="icon" type="submit" className="rounded-full">
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
