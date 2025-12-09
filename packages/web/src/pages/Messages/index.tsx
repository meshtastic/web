import { NodeAvatar } from "@components/NodeAvatar";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@components/ui/resizable";
import { ScrollArea } from "@components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { useChannels, useNodes } from "@db/hooks";
import { useDevice, useDeviceContext } from "@core/stores";
import { cn } from "@core/utils/cn";
import { sortNodes } from "@core/utils/nodeSort";
import { ChatPanel } from "@pages/Messages/ChatPanel";
import { useSearch } from "@tanstack/react-router";
import {
  Columns,
  Hash,
  Plus,
  Rows,
  Search,
  Users,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
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
  type: "direct" | "channel";
  unreadCount?: number;
};

type SplitMode = "none" | "vertical" | "horizontal";

export default function MessagesPage() {
  const device = useDevice();
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);
  useTranslation();
  const searchParams = useSearch({ strict: false });

  // Fetch channels from database
  const { channels: dbChannels } = useChannels(device.id);

  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [secondaryTabId, setSecondaryTabId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<
    "all" | "direct" | "channels"
  >("all");
  const [splitMode, setSplitMode] = useState<SplitMode>("none");

  // Open channel or node from URL on mount
  useEffect(() => {
    const channelParam = searchParams.channel as number | undefined;
    const nodeParam = searchParams.node as number | undefined;

    // Handle channel param (broadcast messages)
    if (channelParam !== undefined) {
      const channelIndex = channelParam;
      if (dbChannels.length > 0) {
        const channel = dbChannels.find(
          (ch) => ch.channelIndex === channelIndex,
        );
        if (channel) {
          const existingTab = openTabs.find(
            (t) => t.contactId === channelIndex && t.type === "channel",
          );
          if (!existingTab) {
            const newTab: Tab = {
              id: Date.now(),
              contactId: channelIndex,
              type: "channel",
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
          } else {
            setActiveTabId(existingTab.id);
          }
        }
      }
    }

    // Handle node param (direct messages)
    if (nodeParam !== undefined) {
      const nodeNum = nodeParam;
      const existingTab = openTabs.find(
        (t) => t.contactId === nodeNum && t.type === "direct",
      );
      if (!existingTab) {
        const newTab: Tab = {
          id: Date.now(),
          contactId: nodeNum,
          type: "direct",
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      } else {
        setActiveTabId(existingTab.id);
      }
    }
  }, [searchParams.channel, searchParams.node, dbChannels]);

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
        online: lastHeardSec > Date.now() / 1000 - 900,
        isFavorite: node.isFavorite ?? false,
        type: "direct",
        nodeNum: node.nodeNum,
        lastHeard: lastHeardSec,
      });
    });

    // Add channels from database (at the top of the list)
    if (dbChannels) {
      dbChannels.forEach((channel) => {
        if (channel.role > 0) {
          const name =
            channel.name ||
            (channel.channelIndex === 0
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
        }
      });
    }

    return contactsList;
  }, [allNodes, dbChannels]);

  // Calculate unread counts for each contact
  const contactsWithUnread = useMemo(() => {
    return contacts.map((contact) => ({
      ...contact,
      unread: 0, // TODO: Query from database
    }));
  }, [contacts]);

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
        setOpenTabs([
          { id: 1, contactId: primaryChannel.id, type: "channel" },
        ]);
        setActiveTabId(1);
      }
    }
  }, [contacts, openTabs.length]);

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
    const existingTab = openTabs.find((t) => t.contactId === contact.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
    } else {
      const newTabId = Math.max(...openTabs.map((t) => t.id), 0) + 1;
      setOpenTabs([
        ...openTabs,
        { id: newTabId, contactId: contact.id, type: contact.type },
      ]);
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

    if (secondaryTabId === tabId) {
      setSecondaryTabId(null);
      if (splitMode !== "none" && newTabs.length < 2) {
        setSplitMode("none");
      }
    }
  };

  const handleTabClick = (tabId: number, isSecondaryPanel = false) => {
    if (isSecondaryPanel) {
      setSecondaryTabId(tabId);
    } else {
      setActiveTabId(tabId);
    }
  };

  const toggleSplitMode = (mode: SplitMode) => {
    if (splitMode === mode) {
      setSplitMode("none");
      setSecondaryTabId(null);
    } else {
      setSplitMode(mode);
      // Auto-select secondary tab if not set
      if (!secondaryTabId && openTabs.length > 1) {
        const otherTab = openTabs.find((t) => t.id !== activeTabId);
        if (otherTab) {
          setSecondaryTabId(otherTab.id);
        }
      }
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
              if (!tabContact) return null;

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
                  className={cn("h-9 w-9 shrink-0", splitMode === "vertical" && "bg-accent")}
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
                  className={cn("h-9 w-9 shrink-0 mr-1", splitMode === "horizontal" && "bg-accent")}
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
    if (splitMode === "none") {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          {renderTabBar(false, activeTabId)}
          <ChatPanel contact={selectedContact} device={device} />
        </div>
      );
    }

    return (
      <ResizablePanelGroup
        direction={splitMode}
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
    );
  };

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
                onClick={() => openChat(contact)}
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
                    <span className="text-sm text-muted-foreground truncate">
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
      {renderChatArea()}
    </div>
  );
}
