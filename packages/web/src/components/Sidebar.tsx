import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import {
  type Page,
  useAppStore,
  useDevice,
  useDeviceStore,
  useNodeDB,
  useSidebar,
} from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  CircleChevronLeft,
  type LucideIcon,
  MapIcon,
  MessageSquareIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import type React from "react";
import { useEffect, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { DeviceInfoPanel } from "./DeviceInfoPanel.tsx";

export interface SidebarProps {
  children?: React.ReactNode;
}

interface NavLink {
  name: string;
  icon: LucideIcon;
  page: Page;
  count?: number;
}

const CollapseToggleButton = () => {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { t } = useTranslation("ui");
  const buttonLabel = isCollapsed
    ? t("sidebar.collapseToggle.button.open")
    : t("sidebar.collapseToggle.button.close");

  return (
    <button
      type="button"
      aria-label={buttonLabel}
      onClick={toggleSidebar}
      className={cn(
        "absolute top-20 right-0 z-10 p-0.5 rounded-full transform translate-x-1/2",
        "transition-colors duration-300 ease-in-out",
        "border border-slate-300 dark:border-slate-200",
        "text-slate-500 dark:text-slate-200 hover:text-slate-400 dark:hover:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-accent transition-transform bg-background-primary",
      )}
    >
      <CircleChevronLeft
        size={24}
        className={cn(
          "transition-transform duration-300 ease-in-out",
          isCollapsed && "rotate-180",
        )}
      />
    </button>
  );
};

export const Sidebar = ({ children }: SidebarProps) => {
  const { hardware, metadata, unreadCounts, setDialogOpen } = useDevice();
  const { getNode, getNodesLength } = useNodeDB();
  const { setCommandPaletteOpen } = useAppStore();
  const savedConnections = useDeviceStore((s) => s.savedConnections);
  const myNode = getNode(hardware.myNodeNum);
  const { isCollapsed } = useSidebar();
  const { t } = useTranslation("ui");
  const navigate = useNavigate({ from: "/" });

  // Get the active connection (connected > default > first)
  const activeConnection =
    savedConnections.find((c) => c.status === "connected") ||
    savedConnections.find((c) => c.isDefault) ||
    savedConnections[0];

  const pathname = useLocation({
    select: (location) => location.pathname.replace(/^\//, ""),
  });

  const myMetadata = metadata.get(0);

  const numUnread = [...unreadCounts.values()].reduce((sum, v) => sum + v, 0);

  const [displayedNodeCount, setDisplayedNodeCount] = useState(() =>
    Math.max(getNodesLength() - 1, 0),
  );

  const [_, startNodeCountTransition] = useTransition();

  const currentNodeCountValue = Math.max(getNodesLength() - 1, 0);

  useEffect(() => {
    if (currentNodeCountValue !== displayedNodeCount) {
      startNodeCountTransition(() => {
        setDisplayedNodeCount(currentNodeCountValue);
      });
    }
  }, [currentNodeCountValue, displayedNodeCount]);

  const pages: NavLink[] = [
    {
      name: t("navigation.messages"),
      icon: MessageSquareIcon,
      page: "messages",
      count: numUnread ? numUnread : undefined,
    },
    { name: t("navigation.map"), icon: MapIcon, page: "map" },
    {
      name: t("navigation.settings"),
      icon: SettingsIcon,
      page: "settings",
    },
    {
      name: `${t("navigation.nodes")} (${displayedNodeCount})`,
      icon: UsersIcon,
      page: "nodes",
    },
  ];

  return (
    <div
      className={cn(
        "relative border-slate-300 dark:border-slate-700",
        "transition-all duration-300 ease-in-out flex-shrink-0",
        isCollapsed ? "w-24" : "w-52 lg:w-64",
      )}
    >
      <CollapseToggleButton />

      <div
        className={cn(
          "h-14 flex mt-2 gap-2 items-center flex-shrink-0 transition-all duration-300 ease-in-out",
          "border-b-[0.5px] border-slate-300 dark:border-slate-700",
          isCollapsed && "justify-center px-0",
        )}
      >
        <img
          src="/logo.svg"
          alt={t("app.logo")}
          className="size-10 flex-shrink-0 rounded-xl"
        />
        <h2
          className={cn(
            "text-xl font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap",
            "transition-all duration-300 ease-in-out",
            isCollapsed
              ? "opacity-0 max-w-0 invisible ml-0"
              : "opacity-100 max-w-xs visible ml-2",
          )}
        >
          {t("app.title")}
        </h2>
      </div>

      <SidebarSection label={t("navigation.title")} className="mt-4 px-0">
        {pages.map((link) => {
          return (
            <SidebarButton
              key={link.name}
              count={link.count}
              label={link.name}
              Icon={link.icon}
              onClick={() => {
                if (myNode !== undefined) {
                  navigate({ to: `/${link.page}` });
                }
              }}
              active={link.page === pathname}
              disabled={myNode === undefined}
            />
          );
        })}
      </SidebarSection>

      <div className={cn("flex-1 min-h-0", isCollapsed && "overflow-hidden")}>
        {children}
      </div>

      <div className=" pt-4 border-t-[0.5px] bg-background-primary border-slate-300 dark:border-slate-700 h-full flex-1">
        {myNode === undefined ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Spinner />
            <Subtle
              className={cn(
                "mt-4 transition-opacity duration-300",
                isCollapsed ? "opacity-0 invisible" : "opacity-100 visible",
              )}
            >
              {t("loading")}
            </Subtle>
          </div>
        ) : (
          <DeviceInfoPanel
            isCollapsed={isCollapsed}
            setCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            setDialogOpen={() => setDialogOpen("deviceName", true)}
            user={{
              longName: myNode?.user?.longName ?? t("unknown.longName"),
              shortName: myNode?.user?.shortName ?? t("unknown.shortName"),
            }}
            firmwareVersion={
              myMetadata?.firmwareVersion ?? t("unknown.notAvailable")
            }
            deviceMetrics={{
              batteryLevel: myNode.deviceMetrics?.batteryLevel,
              voltage:
                typeof myNode.deviceMetrics?.voltage === "number"
                  ? Math.abs(myNode.deviceMetrics?.voltage)
                  : undefined,
            }}
            connectionStatus={activeConnection?.status}
            connectionName={activeConnection?.name}
          />
        )}
      </div>
    </div>
  );
};
