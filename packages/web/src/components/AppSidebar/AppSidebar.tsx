import { Link } from "@app/components/ui/link";
import { NodeAvatar } from "@components/NodeAvatar";
import { Badge } from "@components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@components/ui/sidebar.tsx";
import { useMessages, useNodeDB } from "@core/stores";
import { useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MapIcon,
  MessageSquare,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useMemo } from "react";

const getMainNavItems = (unreadCount: number) => [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
    badge: unreadCount > 0 ? unreadCount : undefined,
  },
  {
    title: "Map",
    url: "/map",
    icon: MapIcon,
  },
  {
    title: "Nodes",
    url: "/nodes",
    icon: Users,
  },
];

const configNavItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Preferences",
    url: "/preferences",
    icon: SlidersHorizontal,
  },
];

export function AppSidebar() {
  const pathname = useLocation().pathname;
  const nodeDB = useNodeDB();
  const messages = useMessages();

  // Get myNode directly - getMyNode now returns immediately without promises
  const myNode = useMemo(() => {
    if (!nodeDB || typeof nodeDB.getNodes !== "function") {
      return undefined;
    }

    const nodes = nodeDB.getNodes(undefined, true);
    const myNodeNum = nodeDB.myNodeNum;

    if (myNodeNum === undefined) {
      return undefined;
    }

    return nodes.find((n) => n.num === myNodeNum);
  }, [nodeDB]);

  // Calculate total unread messages
  const totalUnread = useMemo(() => {
    if (!messages || typeof messages.getTotalUnreadCount !== "function") {
      return 0;
    }
    return messages.getTotalUnreadCount();
  }, [messages]);

  const mainNavItems = useMemo(
    () => getMainNavItems(totalUnread),
    [totalUnread],
  );

  const nodeStats = useMemo(() => {
    if (!nodeDB || typeof nodeDB.getNodes !== "function") {
      return { total: 0, online: 0 };
    }

    const nodes = nodeDB.getNodes(undefined, true); // include self
    const onlineThreshold = Date.now() / 1000 - 60; // 1 minutes

    const onlineCount = nodes.filter(
      (node) => (node.lastHeard || 0) > onlineThreshold,
    ).length;
    return {
      total: nodes.length,
      online: onlineCount,
    };
  }, [nodeDB]);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
            <img src="/icon.svg" alt="Meshtastic Logo" className="h-9 w-9" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-sidebar-foreground">
              Meshtastic
            </span>
            <span className="text-xs text-muted-foreground">Web Client</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="justify-between"
                  >
                    <Link href={item.url}>
                      <span className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </span>
                      {item.badge && (
                        <Badge
                          variant="rounded"
                          className="h-5 min-w-5 justify-center bg-primary text-primary-foreground"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Network Status</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3 space-y-3">
              {/* TODO: Re-add signal strength when we have a way to get it */}
              {/* <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4 text-chart-2" />
                  <span className="text-sm">Signal</span>
                </div>
                <span className="text-sm font-medium text-chart-2">Strong</span>
              </div> */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm">Nodes</span>
                </div>
                <span className="text-sm font-medium">
                  {nodeStats.online} of {nodeStats.total}
                </span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          {myNode && (
            <>
              <NodeAvatar
                nodeNum={myNode.num}
                longName={myNode.user?.longName}
                size="sm"
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">
                  {myNode.user?.longName || myNode.user?.shortName || "My Node"}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  !{myNode.num.toString(16)}
                </span>
              </div>
              <div className="ml-auto h-2 w-2 rounded-full bg-chart-2" />
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
