import { useIsMobile } from "@core/hooks/useIsMobile.ts";
import { useNodesAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useTotalUnread } from "@core/kmp/hooks";
import { useAppStore } from "@core/stores";
import { useLocation, useMatches } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppRail } from "./AppRail.tsx";
import { BottomTabBar } from "./BottomTabBar.tsx";
import { remoteNodeCount, shouldHideTabBar } from "./navItems.ts";
import { useDeviceSummary } from "./useDeviceSummary.ts";

/**
 * App frame around every routed page: the icon rail on desktop, the bottom
 * tab bar on mobile (unless the route sets `staticData.hideTabBar`).
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const pathname = useLocation({ select: (location) => location.pathname });
  const hideTabBar = useMatches({ select: shouldHideTabBar });
  const unreadCount = useTotalUnread();
  const nodeCount = remoteNodeCount(useNodesAsProto().length);
  const device = useDeviceSummary();
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 bg-app">
      {isMobile ? null : (
        <AppRail
          pathname={pathname}
          unreadCount={unreadCount}
          nodeCount={nodeCount}
          device={device}
          onOpenCommandMenu={() => setCommandPaletteOpen(true)}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {children}
        {isMobile && !hideTabBar ? (
          <BottomTabBar pathname={pathname} unreadCount={unreadCount} />
        ) : null}
      </div>
    </div>
  );
};
