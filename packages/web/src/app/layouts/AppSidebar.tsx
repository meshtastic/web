import { isDefined } from "@app/shared";
import { useGetMyNode } from "@app/shared/hooks/useGetMyNode";
import { useConversations, useNodes } from "@data/hooks";
import { NodeAvatar } from "@shared/components/NodeAvatar";
import { ONLINE_THRESHOLD_SECONDS } from "@shared/components/OnlineIndicator";
import { Badge } from "@shared/components/ui/badge";
import { Link } from "@shared/components/ui/link";
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
} from "@shared/components/ui/sidebar";
import { useDevice, useDeviceContext } from "@state/index.ts";
import { useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MapIcon,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

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
];

export function AppSidebar() {
  const pathname = useLocation().pathname;

  const { deviceId } = useDeviceContext();
  const { t } = useTranslation();
  const { nodes: allNodes } = useNodes(deviceId);
  const myNode = useGetMyNode();

  const { conversations } = useConversations(deviceId, myNode.myNodeNum ?? 0);

  // Calculate total unread messages
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);
  }, [conversations]);

  const mainNavItems = useMemo(
    () => getMainNavItems(totalUnread),
    [totalUnread],
  );

  const nodeStats = useMemo(() => {
    const onlineThreshold = Date.now() / 1000 - ONLINE_THRESHOLD_SECONDS;

    const onlineCount = allNodes.filter((node) => {
      const lastHeardSec = node.lastHeard
        ? Math.floor(node.lastHeard.getTime() / 1000)
        : 0;
      return lastHeardSec > onlineThreshold;
    }).length;

    return {
      total: allNodes.length,
      online: onlineCount,
    };
  }, [allNodes]);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
            <img src="/logo.svg" alt="Meshtastic Logo" className="h-9 w-9" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-sidebar-foreground">
              {t("app.title")}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("app.subtitle")}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.title")}</SidebarGroupLabel>
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
          <SidebarGroupLabel>{t("navigation.networkStatus")}</SidebarGroupLabel>
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
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <div className="text-sm">
                  <div>
                    {nodeStats.online} of {nodeStats.total}
                  </div>
                  <div className="text-muted-foreground">nodes online</div>
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        {myNode?.myNode && (
          <div className="flex items-center gap-3">
            <NodeAvatar
              nodeNum={myNode.myNodeNum ?? 0}
              longName={myNode.myNode.longName ?? undefined}
              clickable={true}
              size="sm"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium truncate">
                {myNode.myNode.longName || myNode.myNode.shortName}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                !{myNode.myNodeNum?.toString(16)}
              </span>
            </div>
            <div className="ml-auto h-2 w-2 rounded-full bg-chart-2" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
