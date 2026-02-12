import { useMyNode } from "@app/shared/index.ts";
import {
  useChannels,
  useConversations,
  useNodes,
  useOnlineNodes,
} from "@data/hooks";
import type { ConversationType } from "@data/types";
import { sortNodes } from "@features/nodes/utils/nodeSort";
import { NodeAvatar } from "@shared/components/NodeAvatar.tsx";
import { OnlineIndicator } from "@shared/components/OnlineIndicator";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { IconButton } from "@shared/components/ui/icon-button";
import { Input } from "@shared/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@shared/components/ui/resizable";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import { cn } from "@shared/utils/cn";
import { type SplitMode, useUIStore } from "@state/index.ts";
import { useShallow } from "zustand/shallow";
import { Columns, Hash, ListX, Rows, Search, Users, X } from "lucide-react";
import type React from "react";
import { Activity, useEffect, useMemo, useState } from "react";
import { ChatPanel } from "../components/index.ts";

export type Contact = {
  id: number;
  name: string;
  nodeId: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  isFavorite: boolean;
  type: ConversationType;
  nodeNum?: number;
  lastHeard?: number;
};

export default function MessagesPage() {
  const { myNodeNum } = useMyNode();

  const { nodes: allNodes } = useNodes(myNodeNum);
  const { onlineNodeIds } = useOnlineNodes(myNodeNum);

  // Fetch channels from database (myNodeNum is used as ownerNodeNum for all queries)
  const { channels: dbChannels } = useChannels(myNodeNum);
  const { conversations } = useConversations(myNodeNum);

  const openTabs = useUIStore(useShallow((state) => state.messageTabs));
  const activeTabId = useUIStore((state) => state.activeMessageTabId);
  const secondaryTabId = useUIStore((state) => state.secondaryMessageTabId);
  const splitMode = useUIStore((state) => state.messageSplitMode);
  const openMessageTab = useUIStore((state) => state.openMessageTab);
  const closeMessageTab = useUIStore((state) => state.closeMessageTab);
  const closeAllMessageTabs = useUIStore((state) => state.closeAllMessageTabs);
  const setSecondaryMessageTab = useUIStore(
    (state) => state.setSecondaryMessageTab,
  );
  const setMessageSplitMode = useUIStore((state) => state.setMessageSplitMode);

  // Local UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<
    "all" | "direct" | "channels"
  >("all");

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const secondaryTab = openTabs.find((t) => t.id === secondaryTabId);

  const contacts = useMemo<Contact[]>(() => {
    const contactsList: Contact[] = [];

    // Add nodes from database
    allNodes.forEach((node) => {
      if (node.nodeNum == null) {
        return;
      }
      const name = node.longName || node.shortName || `Node ${node.nodeNum}`;
      contactsList.push({
        id: node.nodeNum,
        name,
        nodeId: `!${node.nodeNum.toString(16)}`,
        lastMessage: "",
        time: "",
        unread: 0,
        online: onlineNodeIds.has(node.nodeNum),
        isFavorite: node.isFavorite,
        type: "direct",
        nodeNum: node.nodeNum,
        lastHeard: node.lastHeard?.getTime() ?? 0,
      });
    });

    if (dbChannels) {
      dbChannels
        .filter((channel) => channel.role === 1 || channel.role === 2)
        .forEach((channel) => {
          // Channel 1 is always "Primary", others use custom name or fallback
          const name =
            channel.channelIndex === 1
              ? "Primary"
              : channel.name?.trim() || `Channel ${channel.channelIndex}`;
          contactsList.unshift({
            id: channel.channelIndex,
            name,
            nodeId: `#${channel.channelIndex}`,
            lastMessage: "",
            time: "",
            unread: 0,
            online: true,
            isFavorite: false,
            type: "channel",
            lastHeard: 0,
          });
        });
    }

    return contactsList;
  }, [allNodes, dbChannels, onlineNodeIds]);

  // Calculate unread counts for each contact
  const contactsWithUnread = useMemo(() => {
    return contacts.map((contact) => {
      const conversation = conversations.find(
        (c) => c.type === contact.type && c.id === contact.id,
      );
      return {
        ...contact,
        unread: conversation?.unreadCount || 0,
        lastMessage: conversation?.lastMessage?.message || "",
        time: conversation?.lastMessage?.date
          ? new Date(conversation.lastMessage.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "",
      };
    });
  }, [contacts, conversations]);

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
        openMessageTab(primaryChannel.id, "channel");
      }
    }
  }, [contacts, openTabs.length, openMessageTab]);

  // Helper to create placeholder contact when real contact not loaded yet
  const getContactOrPlaceholder = (
    tab: { contactId: number; type: ConversationType } | undefined,
  ): Contact | null => {
    if (!tab) {
      return null;
    }
    const found = contacts.find(
      (c) => c.id === tab.contactId && c.type === tab.type,
    );
    if (found) {
      return found;
    }
    return {
      id: tab.contactId,
      name:
        tab.type === "channel"
          ? `Channel ${tab.contactId}`
          : `Node ${tab.contactId}`,
      nodeId:
        tab.type === "channel"
          ? `#${tab.contactId}`
          : `!${tab.contactId.toString(16)}`,
      lastMessage: "",
      time: "",
      unread: 0,
      online: false,
      isFavorite: false,
      type: tab.type,
    };
  };

  const selectedContact = getContactOrPlaceholder(activeTab);
  const secondaryContact = getContactOrPlaceholder(secondaryTab);

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

    return sortNodes(filtered, {
      getName: (c) => c.name,
      getLastHeard: (c) => c.lastHeard ?? 0,
      isFavorite: (c) => c.isFavorite,
      isChannel: (c) => c.type === "channel",
    });
  }, [contactsWithUnread, searchQuery, contactFilter]);

  const closeTab = (tabId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openTabs.length === 1) {
      return;
    }
    closeMessageTab(tabId);
  };

  const handleTabClick = (tabId: number, isSecondaryPanel = false) => {
    if (isSecondaryPanel) {
      setSecondaryMessageTab(tabId);
    }
  };

  const toggleSplitMode = (mode: SplitMode) => {
    if (splitMode === mode) {
      setMessageSplitMode("none");
    } else {
      setMessageSplitMode(mode);
    }
  };

  const renderTabBar = (
    isSecondaryPanel = false,
    currentTabId: number | null,
  ) => (
    <div className="border-b bg-muted/30">
      <div className="flex items-center">
        <ScrollArea className="flex-1">
          <div className="flex flex-nowrap">
            {tabsWithUnread.map((tab) => {
              const tabContact = contacts.find(
                (c) => c.id === tab.contactId && c.type === tab.type,
              );
              const displayContact: Contact = tabContact ?? {
                id: tab.contactId,
                name:
                  tab.type === "channel"
                    ? tab.contactId === 0
                      ? "Primary"
                      : `Channel ${tab.contactId}`
                    : `Node ${tab.contactId}`,
                nodeId:
                  tab.type === "channel"
                    ? `#${tab.contactId}`
                    : `!${tab.contactId.toString(16)}`,
                lastMessage: "",
                time: "",
                unread: 0,
                online: false,
                isFavorite: false,
                type: tab.type,
              };

              const isActive = currentTabId === tab.id;

              const tabContent = (
                <>
                  {displayContact.type === "channel" ? (
                    <Hash className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <div className="relative shrink-0">
                      <NodeAvatar
                        nodeNum={displayContact.nodeNum || displayContact.id}
                        longName={displayContact.name}
                        size="xs"
                        showFavorite={displayContact.isFavorite}
                        clickable={true}
                      />
                      {displayContact.online &&
                        displayContact.type === "direct" && (
                          <OnlineIndicator className="absolute -bottom-0.5 -right-0.5 h-2 w-2 border" />
                        )}
                    </div>
                  )}
                  <span className="text-sm md:text-base truncate flex-1">
                    {displayContact.name}
                  </span>
                  <Activity mode={tab.unreadCount > 0 ? "visible" : "hidden"}>
                    <Badge className="h-5 min-w-5 justify-center bg-primary text-primary-foreground shrink-0">
                      {tab.unreadCount}
                    </Badge>
                  </Activity>
                  <Activity mode={openTabs.length > 1 ? "visible" : "hidden"}>
                    <button
                      type="button"
                      onClick={(e) => closeTab(tab.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 transition-opacity shrink-0"
                      title="Close tab"
                    >
                      <X className="size-4 text-muted-foreground" />
                    </button>
                  </Activity>
                </>
              );

              const tabClassName = cn(
                "group flex items-center gap-2 px-4 py-2 border-r cursor-pointer transition-colors max-w-50",
                isActive
                  ? "bg-background border-b-2 border-b-primary"
                  : "hover:bg-muted/50",
              );

              // Secondary panel tabs update local state only
              if (isSecondaryPanel) {
                return (
                  <div
                    key={tab.id}
                    role="tab"
                    aria-selected={tab.id === activeTabId}
                    tabIndex={0}
                    onClick={() => handleTabClick(tab.id, true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleTabClick(tab.id, true);
                      }
                    }}
                    className={tabClassName}
                  >
                    {tabContent}
                  </div>
                );
              }

              return (
                <div
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={0}
                  onClick={() => openMessageTab(tab.contactId, tab.type)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openMessageTab(tab.contactId, tab.type);
                    }
                  }}
                  className={tabClassName}
                >
                  {tabContent}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        {!isSecondaryPanel ? (
          <>
            <IconButton
              tooltip="Close all tabs"
              icon={<ListX className="h-4 w-4" />}
              onClick={closeAllMessageTabs}
              disabled={openTabs.length === 0}
            />
            <IconButton
              tooltip="Split vertical"
              icon={<Columns className="h-4 w-4" />}
              className={cn(splitMode === "vertical" && "bg-accent")}
              onClick={() => toggleSplitMode("vertical")}
            />
            <IconButton
              tooltip="Split horizontal"
              icon={<Rows className="h-4 w-4" />}
              className={cn("mr-1", splitMode === "horizontal" && "bg-accent")}
              onClick={() => toggleSplitMode("horizontal")}
            />
          </>
        ) : (
          <IconButton
            tooltip="Close split"
            icon={<X className="h-4 w-4" />}
            className="mr-1"
            onClick={() => setMessageSplitMode("none")}
          />
        )}
      </div>
    </div>
  );

  const renderChatArea = () => {
    // Key forces ChatPanel to remount when contact changes, ensuring hooks reinitialize
    const primaryKey = `${selectedContact?.type}-${selectedContact?.id}`;
    const secondaryKey = `${secondaryContact?.type}-${secondaryContact?.id}`;

    return (
      <>
        <Activity mode={splitMode === "none" ? "visible" : "hidden"}>
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderTabBar(false, activeTabId)}
            <ChatPanel key={primaryKey} contact={selectedContact} />
          </div>
        </Activity>
        <Activity mode={splitMode !== "none" ? "visible" : "hidden"}>
          <ResizablePanelGroup
            direction={splitMode === "none" ? "horizontal" : splitMode}
            className="flex-1"
          >
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="flex flex-col h-full overflow-hidden">
                {renderTabBar(false, activeTabId)}
                <ChatPanel
                  key={`split-${primaryKey}`}
                  contact={selectedContact}
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="flex flex-col h-full overflow-hidden">
                {renderTabBar(true, secondaryTabId)}
                <ChatPanel
                  key={`split-${secondaryKey}`}
                  contact={secondaryContact}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Activity>
      </>
    );
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col min-h-0">
        <div className="p-4 border-b space-y-3 shrink-0">
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
            {filteredContacts.map((contact) => {
              const isSelected =
                selectedContact?.id === contact.id &&
                selectedContact?.type === contact.type;

              return (
                <button
                  key={`${contact.type}-${contact.id}`}
                  type="button"
                  onClick={() => openMessageTab(contact.id, contact.type)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
                    isSelected
                      ? "bg-sidebar-accent"
                      : "hover:bg-sidebar-accent/50",
                  )}
                >
                  {contact.type === "channel" ? (
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <div className="relative">
                      <NodeAvatar
                        nodeNum={contact.nodeNum || contact.id}
                        longName={contact.name}
                        size="sm"
                        showFavorite={contact.isFavorite}
                        clickable={true}
                      />
                      {contact.online && (
                        <OnlineIndicator className="absolute bottom-0 right-0 h-3 w-3" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {contact.name}
                      </span>
                      <span className="text-xs md:text-sm text-muted-foreground">
                        {contact.time}
                      </span>
                    </div>
                    {(contact.lastMessage || contact.unread > 0) && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm md:text-base text-muted-foreground truncate">
                          {contact.lastMessage}
                        </span>
                        {contact.unread > 0 && (
                          <Badge className="h-5 min-w-5 justify-center bg-primary text-primary-foreground">
                            {contact.unread}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {renderChatArea()}
    </div>
  );
}
