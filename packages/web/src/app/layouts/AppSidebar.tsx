import {
  useConnect,
  useConversations,
  useNodes,
  useOnlineCount,
} from "@data/hooks";
import { ConnectionService } from "@features/connect/services/ConnectionService";
import { NodeAvatar } from "@shared/components/NodeAvatar";
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
import { Skeleton } from "@shared/components/ui/skeleton";
import { useMyNode } from "@shared/hooks";
import { useDevice } from "@state/index.ts";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  CableIcon,
  CheckIcon,
  LayoutDashboard,
  LogOutIcon,
  MapIcon,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";

const getMainNavItems = (nodeNum: number, unreadCount: number) => {
  const basePath = `/${nodeNum}`;
  return [
    {
      title: "Dashboard",
      url: `${basePath}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: "Messages",
      url: `${basePath}/messages`,
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      title: "Map",
      url: `${basePath}/map`,
      icon: MapIcon,
    },
    {
      title: "Nodes",
      url: `${basePath}/nodes`,
      icon: Users,
    },
  ];
};

const getConfigNavItems = (nodeNum: number) => {
  const basePath = `/${nodeNum}`;
  return [
    {
      title: "Settings",
      url: `${basePath}/settings`,
      icon: Settings,
    },
  ];
};

function SidebarSkeleton() {
  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Skeleton className="h-4 w-20" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Skeleton className="h-12 w-full" />
      </SidebarFooter>
    </>
  );
}

function ConnectedSidebarContent() {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();

  const device = useDevice();
  const { t } = useTranslation();
  const { myNodeNum, myNode } = useMyNode();

  const { nodes: allNodes, nodeMap } = useNodes(myNodeNum);
  const { count: onlineCount } = useOnlineCount(myNodeNum);
  const { connections } = useConnect();

  // Find connection for current device by nodeNum
  const activeConnection = connections.find((c) => c.nodeNum === myNodeNum);

  const remoteAdminTarget = device.remoteAdminTargetNode;
  const isRemoteAdmin = remoteAdminTarget !== null;
  const isAuthorized = device.remoteAdminAuthorized;
  const remoteNode = remoteAdminTarget ? nodeMap.get(remoteAdminTarget) : null;

  const getStatusColor = () => {
    if (!activeConnection) {
      return "bg-gray-400";
    }
    if (isRemoteAdmin && !isAuthorized) {
      return "bg-red-500";
    }
    switch (activeConnection.status) {
      case "connected":
      case "configured":
        return "bg-chart-2";
      case "connecting":
      case "configuring":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const { conversations } = useConversations(myNodeNum);

  const displayNode = isRemoteAdmin ? remoteNode : myNode;
  const displayNodeNum = isRemoteAdmin ? remoteAdminTarget : myNodeNum;
  const displayName = isRemoteAdmin
    ? `[Remote] ${remoteNode?.longName ?? remoteNode?.shortName ?? t("unknown.longName")}`
    : (displayNode?.longName ??
      displayNode?.shortName ??
      t("unknown.longName"));

  const totalUnread = useMemo(() => {
    return conversations.reduce((acc, conv) => acc + conv.unreadCount, 0);
  }, [conversations]);

  const mainNavItems = useMemo(
    () => getMainNavItems(myNodeNum, totalUnread),
    [myNodeNum, totalUnread],
  );

  const configNavItems = useMemo(
    () => getConfigNavItems(myNodeNum),
    [myNodeNum],
  );

  const nodeStats = useMemo(
    () => ({
      total: allNodes.length,
      online: onlineCount,
    }),
    [allNodes.length, onlineCount],
  );

  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.title")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      pathname.startsWith(item.url + "/")
                    }
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
          <SidebarGroupLabel>{t("navigation.configuration")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {configNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      pathname.startsWith(item.url + "/")
                    }
                  >
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
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <div className="text-sm">
                  <div>
                    {t("nodes.onlineTotal", {
                      online: nodeStats.online,
                      total: nodeStats.total,
                    })}
                  </div>
                  <div className="text-muted-foreground">{t("nodes.text")}</div>
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
                    className={`ml-auto h-2 w-2 rounded-full ${getStatusColor()}`}
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
                    {myNode && (
                      <DropdownMenuItem
                        onClick={() => device.setRemoteAdminTarget(null)}
                      >
                        {!isRemoteAdmin && (
                          <CheckIcon className="mr-2 h-4 w-4" />
                        )}
                        <span className={!isRemoteAdmin ? "" : "ml-6"}>
                          {myNode.longName ?? myNode.shortName}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          Local
                        </span>
                      </DropdownMenuItem>
                    )}
                    {/* Remote nodes from history */}
                    {device.recentlyConnectedNodes
                      .filter((nodeNum) => nodeNum !== myNodeNum)
                      .map((nodeNum) => {
                        const node = nodeMap.get(nodeNum);
                        const isSelected = remoteAdminTarget === nodeNum;
                        return (
                          <DropdownMenuItem
                            key={nodeNum}
                            onClick={() =>
                              device.setRemoteAdminTarget(
                                nodeNum,
                                node?.publicKey ?? undefined,
                              )
                            }
                          >
                            {isSelected && (
                              <CheckIcon className="mr-2 h-4 w-4" />
                            )}
                            <span className={isSelected ? "" : "ml-6"}>
                              {node?.longName ??
                                node?.shortName ??
                                `!${nodeNum.toString(16)}`}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => navigate({ to: "/connect" })}>
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
    </>
  );
}

function DisconnectedSidebarContent() {
  const { t } = useTranslation();

  return (
    <>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.title")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-6 text-sm text-muted-foreground text-center">
              Connect to a device to access navigation
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="text-sm text-muted-foreground text-center">
          No device connected
        </div>
      </SidebarFooter>
    </>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const { t } = useTranslation();

  // Check if we're on a connected route (/:nodeNum/*)
  const isConnectedRoute = /^\/\d+\//.test(location.pathname);

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

      {isConnectedRoute ? (
        <Suspense fallback={<SidebarSkeleton />}>
          <ConnectedSidebarContent />
        </Suspense>
      ) : (
        <DisconnectedSidebarContent />
      )}
    </Sidebar>
  );
}
