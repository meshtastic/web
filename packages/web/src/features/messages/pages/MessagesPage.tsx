import { useChannels, useConversations, useNodes } from "@data/hooks";
import type { ConversationType } from "@data/types";
import { sortNodes } from "@features/nodes/utils/nodeSort";
import { NodeAvatar } from "@shared/components/NodeAvatar.tsx";
import {
  ONLINE_THRESHOLD_SECONDS,
  OnlineIndicator,
} from "@shared/components/OnlineIndicator";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@shared/components/ui/resizable";
import { ScrollArea } from "@shared/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@shared/utils/cn";
import {
  type SplitMode,
  useDevice,
  useDeviceContext,
  useUIStore,
} from "@state/index.ts";
import { useSearch } from "@tanstack/react-router";
import { Columns, Hash, Plus, Rows, Search, Users, X } from "lucide-react";
import type React from "react";
import { Activity, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const device = useDevice();
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);
  useTranslation();
  const searchParams = useSearch({ strict: false });

  // Fetch channels from database
  const { channels: dbChannels } = useChannels(device.id);
  const { conversations } = useConversations(
    device.id,
    device.getMyNodeNum() ?? 0,
  );

  // Tab state from store
  const openTabs = useUIStore((state) => state.messageTabs);
  const activeTabId = useUIStore((state) => state.activeMessageTabId);
  const secondaryTabId = useUIStore((state) => state.secondaryMessageTabId);
  const splitMode = useUIStore((state) => state.messageSplitMode);
  const openMessageTab = useUIStore((state) => state.openMessageTab);
  const closeMessageTab = useUIStore((state) => state.closeMessageTab);
  const setActiveMessageTab = useUIStore((state) => state.setActiveMessageTab);
  const setSecondaryMessageTab = useUIStore(
    (state) => state.setSecondaryMessageTab,
  );
  const setMessageSplitMode = useUIStore((state) => state.setMessageSplitMode);

  // Local UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<
    "all" | "direct" | "channels"
  >("all");

  // Open channel or node from URL on mount
  useEffect(() => {
    const channelParam = searchParams.channel as number | undefined;
    const nodeParam = searchParams.node as number | undefined;

    // Handle channel param (broadcast messages)
    if (channelParam !== undefined && dbChannels.length > 0) {
      const channel = dbChannels.find((ch) => ch.channelIndex === channelParam);
      if (channel) {
        openMessageTab(channelParam, "channel");
      }
    }

    // Handle node param (direct messages)
    if (nodeParam !== undefined) {
      openMessageTab(nodeParam, "direct");
    }
  }, [searchParams.channel, searchParams.node, dbChannels, openMessageTab]);

  // Get active tab info
  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const secondaryTab = openTabs.find((t) => t.id === secondaryTabId);

  // Get contacts from database nodes and channels
  const contacts = useMemo<Contact[]>(() => {
    const contactsList: Contact[] = [];

    // Add nodes from database
    allNodes.forEach((node) => {
      const name = node.longName || node.shortName || `Node ${node.nodeNum}`;
      const lastHeardSec = node.lastHeard
        ? Math.floor(node.lastHeard.getTime() / 1000)
        : 0;
      contactsList.push({
        id: node.nodeNum,
        name,
        nodeId: `!${node.nodeNum.toString(16)}`,
        lastMessage: "",
        time: "",
        unread: 0,
        online: lastHeardSec > Date.now() / 1000 - ONLINE_THRESHOLD_SECONDS,
        isFavorite: node.isFavorite ?? false,
        type: "direct",
        nodeNum: node.nodeNum,
        lastHeard: lastHeardSec,
      });
    });

    // Add channels from database (at the top of the list)
    // Only show PRIMARY (1) or SECONDARY (2) channels, not DISABLED (0)
    if (dbChannels) {
      dbChannels
        .filter((channel) => channel.role === 1 || channel.role === 2)
        .forEach((channel) => {
          // Use custom name only if non-empty, otherwise use role-based naming
          const name =
            channel.name?.trim() ||
            (channel.role === 1
              ? "Primary"
              : `Channel ${channel.channelIndex}`);
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
  }, [allNodes, dbChannels]);

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
        openMessageTab(primaryChannel.id, "channel");
      }
    }
  }, [contacts, openTabs.length, openMessageTab]);

  const selectedContact = activeTab
    ? contacts.find((c) => c.id === activeTab.contactId)
    : null;

  const secondaryContact = secondaryTab
    ? contacts.find((c) => c.id === secondaryTab.contactId)
    : null;

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

  const openChat = (contact: Contact) => {
    openMessageTab(contact.id, contact.type);
  };

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
    } else {
      setActiveMessageTab(tabId);
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
              const tabContact = contacts.find((c) => c.id === tab.contactId);
              if (!tabContact) {
                return null;
              }

              const isActive = currentTabId === tab.id;

              return (
                <div
                  key={tab.id}
                  role="tab"
                  tabIndex={0}
                  onClick={() => handleTabClick(tab.id, isSecondaryPanel)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTabClick(tab.id, isSecondaryPanel);
                    }
                  }}
                  className={cn(
                    "group flex items-center gap-2 px-4 py-2 border-r cursor-pointer transition-colors min-w-[140px] max-w-[200px]",
                    isActive
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
                      {tabContact.online && tabContact.type === "direct" && (
                        <OnlineIndicator className="absolute -bottom-0.5 -right-0.5 h-2 w-2 border" />
                      )}
                    </div>
                  )}
                  <span className="text-sm md:text-base truncate flex-1">
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
            const availableContact = contacts.find(
              (c) => !openTabs.some((t) => t.contactId === c.id),
            );
            if (availableContact) {
              openChat(availableContact);
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {!isSecondaryPanel && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0",
                    splitMode === "vertical" && "bg-accent",
                  )}
                  onClick={() => toggleSplitMode("vertical")}
                >
                  <Columns className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split vertical</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 shrink-0 mr-1",
                    splitMode === "horizontal" && "bg-accent",
                  )}
                  onClick={() => toggleSplitMode("horizontal")}
                >
                  <Rows className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split horizontal</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );

  const renderChatArea = () => {
    return (
      <>
        <Activity mode={splitMode === "none" ? "visible" : "hidden"}>
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderTabBar(false, activeTabId)}
            <ChatPanel contact={selectedContact} device={device} />
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
                <ChatPanel contact={selectedContact} device={device} />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="flex flex-col h-full overflow-hidden">
                {renderTabBar(true, secondaryTabId)}
                <ChatPanel contact={secondaryContact} device={device} />
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
            {filteredContacts.map((contact) =>
              contact.type === "channel" ? (
                <div
                  key={`${contact.type}-${contact.id}`}
                  className="w-full flex items-center gap-3 rounded-lg p-3 text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Hash className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate">{contact.name}</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  key={`${contact.type}-${contact.id}`}
                  onClick={() => openChat(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
                    selectedContact?.id === contact.id
                      ? "bg-sidebar-accent"
                      : "hover:bg-sidebar-accent/50",
                  )}
                >
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {contact.name}
                      </span>
                      <span className="text-xs md:text-sm text-muted-foreground">
                        {contact.time}
                      </span>
                    </div>
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
                  </div>
                </button>
              ),
            )}
          </div>
        </ScrollArea>
      </div>

      {renderChatArea()}
    </div>
  );
}
