import { isDefined } from "@app/shared";
import { useGetMyNode } from "@app/shared/hooks/useGetMyNode";
import { ConnectionService } from "@features/connections/services/ConnectionService";
import { useConnections, useConversations, useNodes } from "@data/hooks";
import { NodeAvatar } from "@shared/components/NodeAvatar";
import { ONLINE_THRESHOLD_SECONDS } from "@shared/components/OnlineIndicator";
import { Badge } from "@shared/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@shared/components/ui/dropdown-menu";
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
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  CheckIcon,
  CableIcon,
  LayoutDashboard,
  LogOutIcon,
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
  const navigate = useNavigate();

  const { deviceId } = useDeviceContext();
  const device = useDevice();
  const { t } = useTranslation();
  const { nodes: allNodes, nodeMap } = useNodes(deviceId);
  const myNode = useGetMyNode();
  const { connections } = useConnections();

  // Get active connection for disconnect functionality
  const activeConnection = connections.find(
    (c) => c.meshDeviceId === deviceId,
  );

  const { conversations } = useConversations(deviceId, myNode.myNodeNum ?? 0);

  // Remote admin state
  const remoteAdminTarget = device.remoteAdminTargetNode;
  const isRemoteAdmin = remoteAdminTarget !== null;
  const isAuthorized = device.remoteAdminAuthorized;
  const remoteNode = remoteAdminTarget ? nodeMap.get(remoteAdminTarget) : null;

  // Determine what node to display in footer
  const displayNode = isRemoteAdmin ? remoteNode : myNode?.myNode;
  const displayNodeNum = isRemoteAdmin
    ? remoteAdminTarget
    : myNode?.myNodeNum ?? 0;
  const displayName = isRemoteAdmin
    ? `[Remote] ${remoteNode?.longName ?? remoteNode?.shortName ?? "Unknown"}`
    : displayNode?.longName ?? displayNode?.shortName ?? "Unknown";

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
        {displayNode && (
          <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-3 w-full text-left hover:bg-sidebar-accent/50 rounded-md p-1 -m-1 transition-colors"
              >
                <NodeAvatar
                  nodeNum={displayNodeNum}
                  longName={displayNode.longName ?? undefined}
                  size="sm"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {displayName}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    !{displayNodeNum.toString(16)}
                  </span>
                </div>
                <div
                  className={`ml-auto h-2 w-2 rounded-full ${isRemoteAdmin && !isAuthorized ? "bg-red-500" : "bg-chart-2"}`}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel>
                {isRemoteAdmin ? "Remote Administration" : "My Node"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Users className="mr-2 h-4 w-4" />
                  Recently Connected Nodes
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {/* Local node - always first */}
                  {myNode?.myNode && (
                    <DropdownMenuItem
                      onClick={() => device.setRemoteAdminTarget(null)}
                    >
                      {!isRemoteAdmin && (
                        <CheckIcon className="mr-2 h-4 w-4" />
                      )}
                      <span className={!isRemoteAdmin ? "" : "ml-6"}>
                        {myNode.myNode.longName ?? myNode.myNode.shortName}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Local
                      </span>
                    </DropdownMenuItem>
                  )}
                  {/* Remote nodes from history */}
                  {device.recentlyConnectedNodes
                    .filter((nodeNum) => nodeNum !== myNode?.myNodeNum)
                    .map((nodeNum) => {
                      const node = nodeMap.get(nodeNum);
                      const isSelected = remoteAdminTarget === nodeNum;
                      return (
                        <DropdownMenuItem
                          key={nodeNum}
                          onClick={() =>
                            device.setRemoteAdminTarget(nodeNum, node?.publicKey)
                          }
                        >
                          {isSelected && (
                            <CheckIcon className="mr-2 h-4 w-4" />
                          )}
                          <span className={isSelected ? "" : "ml-6"}>
                            {node?.longName ?? node?.shortName ?? `!${nodeNum.toString(16)}`}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => navigate({ to: "/connections" })}>
                <CableIcon className="mr-2 h-4 w-4" />
                Connections
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (activeConnection) {
                    ConnectionService.disconnect(activeConnection);
                  }
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOutIcon className="mr-2 h-4 w-4" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isRemoteAdmin && (
            <div className="text-xs text-muted-foreground mt-3 space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-chart-2" />
                <span>Authorized - can configure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>Not authorized - read only</span>
              </div>
            </div>
          )}
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
