import { Avatar, AvatarFallback } from "@components/ui/avatar";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { ScrollArea } from "@components/ui/scroll-area";
import { cn } from "@core/utils/cn"; // Corrected import path
import {
  Hash,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  Users,
  Video,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

const contacts = [
  {
    id: 1,
    name: "Alpha Node",
    nodeId: "!aaa111",
    lastMessage: "Check position update",
    time: "2m",
    unread: 2,
    online: true,
    type: "direct" as const,
  },
  {
    id: 2,
    name: "Bravo Node",
    nodeId: "!bbb222",
    lastMessage: "Signal strong here",
    time: "15m",
    unread: 0,
    online: true,
    type: "direct" as const,
  },
  {
    id: 3,
    name: "Charlie Node",
    nodeId: "!ccc333",
    lastMessage: "Weather update sent",
    time: "1h",
    unread: 1,
    online: false,
    type: "direct" as const,
  },
  {
    id: 4,
    name: "Delta Node",
    nodeId: "!ddd444",
    lastMessage: "Copy that",
    time: "2h",
    unread: 0,
    online: true,
    type: "direct" as const,
  },
  {
    id: 5,
    name: "Echo Node",
    nodeId: "!eee555",
    lastMessage: "Moving to waypoint",
    time: "3h",
    unread: 0,
    online: false,
    type: "direct" as const,
  },
  {
    id: 6,
    name: "Primary Channel",
    nodeId: "#primary",
    lastMessage: "Network test complete",
    time: "5m",
    unread: 5,
    online: true,
    type: "channel" as const,
  },
  {
    id: 7,
    name: "Emergency",
    nodeId: "#emergency",
    lastMessage: "All clear",
    time: "1h",
    unread: 0,
    online: true,
    type: "channel" as const,
  },
];

const initialMessages: Record<
  number,
  Array<{
    id: number;
    sender: string;
    content: string;
    time: string;
    isMine: boolean;
  }>
> = {
  1: [
    {
      id: 1,
      sender: "Alpha Node",
      content: "Hey, can you confirm your position?",
      time: "10:30 AM",
      isMine: false,
    },
    {
      id: 2,
      sender: "Me",
      content: "Confirmed. I'm at the northern checkpoint.",
      time: "10:31 AM",
      isMine: true,
    },
    {
      id: 3,
      sender: "Alpha Node",
      content: "Great! Signal is strong from your location.",
      time: "10:32 AM",
      isMine: false,
    },
    {
      id: 4,
      sender: "Me",
      content: "Copy that. Moving to secondary position in 10 minutes.",
      time: "10:33 AM",
      isMine: true,
    },
    {
      id: 5,
      sender: "Alpha Node",
      content: "Check position update",
      time: "10:35 AM",
      isMine: false,
    },
  ],
  2: [
    {
      id: 1,
      sender: "Bravo Node",
      content: "Testing signal strength from hill position",
      time: "9:00 AM",
      isMine: false,
    },
    {
      id: 2,
      sender: "Me",
      content: "Receiving you loud and clear",
      time: "9:01 AM",
      isMine: true,
    },
    {
      id: 3,
      sender: "Bravo Node",
      content: "Signal strong here",
      time: "9:05 AM",
      isMine: false,
    },
  ],
  6: [
    {
      id: 1,
      sender: "Alpha Node",
      content: "Starting network test",
      time: "8:00 AM",
      isMine: false,
    },
    {
      id: 2,
      sender: "Bravo Node",
      content: "Ready",
      time: "8:01 AM",
      isMine: false,
    },
    {
      id: 3,
      sender: "Me",
      content: "Standing by",
      time: "8:02 AM",
      isMine: true,
    },
    {
      id: 4,
      sender: "Charlie Node",
      content: "All nodes responding",
      time: "8:05 AM",
      isMine: false,
    },
    {
      id: 5,
      sender: "Alpha Node",
      content: "Network test complete",
      time: "8:10 AM",
      isMine: false,
    },
  ],
};

type Tab = {
  id: number;
  contactId: number;
};

export default function MessagesPage() {
  const [openTabs, setOpenTabs] = useState<Tab[]>([{ id: 1, contactId: 1 }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [contactFilter, setContactFilter] = useState<
    "all" | "direct" | "channels"
  >("all");

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const selectedContact = activeTab
    ? contacts.find((c) => c.id === activeTab.contactId)
    : null;

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
      // Initialize messages if not exists
      if (!messages[contactId]) {
        setMessages((prev) => ({ ...prev, [contactId]: [] }));
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

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return;
    setMessages((prev) => ({
      ...prev,
      [selectedContact.id]: [
        ...(prev[selectedContact.id] || []),
        {
          id: (prev[selectedContact.id]?.length || 0) + 1,
          sender: "Me",
          content: newMessage,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isMine: true,
        },
      ],
    }));
    setNewMessage("");
  };

  const currentMessages = selectedContact
    ? messages[selectedContact.id] || []
    : [];

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
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {contact.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
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
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-[10px] text-primary font-medium">
                              {tabContact.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </span>
                          </div>
                          {tabContact.online &&
                            tabContact.type === "direct" && (
                              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-chart-2" />
                            )}
                        </div>
                      )}
                      <span className="text-sm truncate flex-1">
                        {tabContact.name}
                      </span>
                      {openTabs.length > 1 && (
                        <button
                          onClick={(e) => closeTab(tab.id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 transition-opacity"
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
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {selectedContact.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
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
                {selectedContact.type === "direct" && (
                  <>
                    <Button variant="ghost" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.isMine ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2",
                        message.isMine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      {selectedContact.type === "channel" &&
                        !message.isMine && (
                          <p className="text-xs font-medium text-primary mb-1">
                            {message.sender}
                          </p>
                        )}
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={cn(
                          "text-xs mt-1",
                          message.isMine
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder={`Message ${selectedContact.name}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button size="icon" onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
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
