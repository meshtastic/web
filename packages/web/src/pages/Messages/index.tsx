import { NodeAvatar } from "@components/NodeAvatar";
import { MessageBubble } from "@components/PageComponents/Messages/MessageBubble";
import { MessageInput } from "@components/PageComponents/Messages/MessageInput";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Input } from "@components/ui/input";
import { ScrollArea } from "@components/ui/scroll-area";
import { useMessagePipeline } from "@core/hooks/useMessagePipeline";
import { useWindowFocus } from "@core/hooks/useWindowFocus";
import { MessageType, useDevice, useMessages, useNodeDB } from "@core/stores";
import { cn } from "@core/utils/cn";
import type { Types } from "@meshtastic/core";
import { groupMessagesByDay, toTimestamp } from "@pages/Messages/MessageUtils";
import {
  ArrowUpDown,
  Columns,
  Hash,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type Contact = {
  id: number;
  name: string;
  nodeId: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  isFavorite: boolean;
  type: "direct" | "channel";
  nodeNum?: number;
  lastHeard?: number;
};

type Tab = {
  id: number;
  contactId: number;
  unreadCount?: number;
};

export default function MessagesPage() {
  const device = useDevice();
  const nodeDB = useNodeDB();
  const messages = useMessages();
  const { i18n, t } = useTranslation();

  // Set up message pipeline handlers
  useMessagePipeline();

  // Track if window/tab is focused
  const isWindowFocused = useWindowFocus();

  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<
    "all" | "direct" | "channels"
  >("all");
  const [sortBy, setSortBy] = useState<
    "lastOnline" | "alphabetical" | "unread"
  >("lastOnline");
  const [splitView, setSplitView] = useState(false);

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
        isFavorite: false,
        type: "direct",
        nodeNum: node.num,
        lastHeard: node.lastHeard || 0,
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
            isFavorite: false,
            type: "channel",
            lastHeard: 0, // Channels don't have lastHeard, use 0
          });
        }
      });
    }

    return contactsList;
  }, [nodeDB, device.channels]);

  // Calculate unread counts for each contact
  const contactsWithUnread = useMemo(() => {
    return contacts.map((contact) => {
      let unreadCount = 0;

      if (contact.type === "channel") {
        // Count unread broadcast messages
        const channelMessages = messages.getMessages({
          type: MessageType.Broadcast,
          channelId: contact.id as Types.ChannelNumber,
        });
        unreadCount = channelMessages.filter((msg) => !msg.read).length;
      } else if (contact.nodeNum) {
        // Count unread direct messages
        const directMessages = messages.getMessages({
          type: MessageType.Direct,
          nodeA: device.myNodeNum,
          nodeB: contact.nodeNum,
        });
        unreadCount = directMessages.filter(
          (msg) => !msg.read && msg.from !== contact.nodeNum,
        ).length;
      }

      return {
        ...contact,
        unread: unreadCount,
      };
    });
  }, [contacts, messages, device.myNodeNum]);

  // Update tabs with unread counts
  const tabsWithUnread = useMemo(() => {
    return openTabs.map((tab) => {
      const contact = contactsWithUnread.find((c) => c.id === tab.contactId);
      return {
        ...tab,
        unreadCount: contact?.unread || 0,
      };
    });
  }, [openTabs, contactsWithUnread]);

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

  const activeTab = tabsWithUnread.find((t) => t.id === activeTabId);
  const selectedContact = activeTab
    ? contacts.find((c) => c.id === activeTab.contactId)
    : null;

  // Mark conversation as read when it becomes active and window is focused
  useEffect(() => {
    if (!selectedContact || !device.myNodeNum || !isWindowFocused) {
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
  }, [device.myNodeNum, messages, selectedContact, isWindowFocused]);

  const filteredContacts = useMemo(() => {
    const filtered = contactsWithUnread.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.nodeId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        contactFilter === "all" ||
        (contactFilter === "direct" && contact.type === "direct") ||
        (contactFilter === "channels" && contact.type === "channel");

      return matchesSearch && matchesFilter;
    });

    // Separate into groups: channels, favorites, and regular contacts
    const channels = filtered.filter((c) => c.type === "channel");
    const favorites = filtered.filter(
      (c) => c.type === "direct" && c.isFavorite,
    );
    const regular = filtered.filter(
      (c) => c.type === "direct" && !c.isFavorite,
    );

    // Sort function based on selected criteria
    const sortFn = (a: Contact, b: Contact) => {
      if (sortBy === "alphabetical") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "unread") {
        return b.unread - a.unread;
      }
      // Default: lastOnline
      return (b.lastHeard || 0) - (a.lastHeard || 0);
    };

    // Sort channels and regular contacts, but keep favorites in their natural order
    // Order: channels (sorted) -> favorites (unsorted) -> regular (sorted)
    return [...channels.sort(sortFn), ...favorites, ...regular.sort(sortFn)];
  }, [contactsWithUnread, searchQuery, contactFilter, sortBy]);

  const openChat = (contactId: number) => {
    const existingTab = openTabs.find((t) => t.contactId === contactId);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const newTabId = Math.max(...openTabs.map((t) => t.id), 0) + 1;
      setOpenTabs([...openTabs, { id: newTabId, contactId }]);
      setActiveTabId(newTabId);
    }
  };

  const closeTab = (tabId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openTabs.length === 1) {
      return;
    }

    const newTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(newTabs);

    if (activeTabId === tabId && newTabs.length > 0) {
      const nextTab = newTabs[newTabs.length - 1];
      if (nextTab) {
        setActiveTabId(nextTab.id);
      }
    }
  };

  const handleTabClick = (tabId: number) => {
    setActiveTabId(tabId);

    // Only mark messages as read if window is focused
    if (!isWindowFocused) {
      return;
    }

    // Mark messages as read for this tab
    const tab = openTabs.find((t) => t.id === tabId);
    if (!tab || !device.myNodeNum) {
      return;
    }

    const contact = contacts.find((c) => c.id === tab.contactId);
    if (!contact) {
      return;
    }

    if (contact.type === "channel") {
      messages.markConversationAsRead({
        type: MessageType.Broadcast,
        channelId: contact.id as Types.ChannelNumber,
      });
    } else if (contact.nodeNum) {
      messages.markConversationAsRead({
        type: MessageType.Direct,
        nodeA: device.myNodeNum,
        nodeB: contact.nodeNum,
      });
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as typeof sortBy)}
                >
                  <DropdownMenuRadioItem value="lastOnline">
                    Last Online
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="alphabetical">
                    Alphabetical
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="unread">
                    Unread Count
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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
                      showFavorite={contact.isFavorite}
                    />
                  )}
                  {contact.online && contact.type === "direct" && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-chart-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{contact.name}</span>
                    <span className="text-xs text-muted-foreground">
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
            <ScrollArea className="flex-1" orientation="horizontal">
              <div className="flex flex-nowrap">
                {tabsWithUnread.map((tab) => {
                  const tabContact = contacts.find(
                    (c) => c.id === tab.contactId,
                  );
                  if (!tabContact) {
                    return null;
                  }
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
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
                          <NodeAvatar
                            nodeNum={tabContact.nodeNum || tabContact.id}
                            longName={tabContact.name}
                            size="xs"
                            showFavorite={tabContact.isFavorite}
                            clickable={false}
                          />
                          {tabContact.online &&
                            tabContact.type === "direct" && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-chart-2" />
                            )}
                        </div>
                      )}
                      <span className="text-sm truncate flex-1">
                        {tabContact.name}
                      </span>
                      {tab.unreadCount > 0 && (
                        <Badge className="h-5 min-w-5 justify-center bg-primary text-primary-foreground shrink-0">
                          {tab.unreadCount}
                        </Badge>
                      )}
                      {openTabs.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => closeTab(tab.id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 transition-opacity shrink-0"
                          title="Close tab"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </button>
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
                      showFavorite={selectedContact.isFavorite}
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSplitView(!splitView)}
                  className={splitView ? "bg-accent" : ""}
                >
                  <Columns className="h-4 w-4" />
                </Button>
              </div>
            </div>

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
                        isMine={message.from === device.myNodeNum}
                      />
                    ))}
                  </Fragment>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <MessageInput
              selectedContact={selectedContact}
              device={device}
              messages={messages}
            />
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
