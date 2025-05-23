import React from "react";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Page } from "@core/stores/deviceStore.ts";
import { Spinner } from "@components/UI/Spinner.tsx";
import { Avatar } from "@components/UI/Avatar.tsx";

import {
  CircleChevronLeft,
  CpuIcon,
  LayersIcon,
  type LucideIcon,
  MapIcon,
  MessageSquareIcon,
  PenLine,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "@core/utils/cn.ts";
import { useSidebar } from "@core/stores/sidebarStore.tsx";
import ThemeSwitcher from "@components/ThemeSwitcher.tsx";
import { useAppStore } from "@core/stores/appStore.ts";
import BatteryStatus from "@components/BatteryStatus.tsx";
import { SidebarButton } from "@components/UI/Sidebar/SidebarButton.tsx";
import { useTranslation } from "react-i18next"; // Import useTranslation

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
  const { t } = useTranslation();
  const buttonLabel = isCollapsed
    ? t("sidebar_collapseToggle-button_open")
    : t("sidebar_collapseToggle_button_close");

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
  const {
    hardware,
    getNode,
    getNodesLength,
    metadata,
    activePage,
    unreadCounts,
    setActivePage,
    setDialogOpen,
  } = useDevice();
  const { setCommandPaletteOpen } = useAppStore();
  const myNode = getNode(hardware.myNodeNum);
  const { isCollapsed } = useSidebar();
  const { t } = useTranslation();
  const myMetadata = metadata.get(0);

  const numUnread = [...unreadCounts.values()].reduce((sum, v) => sum + v, 0);

  const pages: NavLink[] = [
    {
      name: t("navigation_title_messages"),
      icon: MessageSquareIcon,
      page: "messages",
      count: numUnread ? numUnread : undefined,
    },
    { name: t("navigation_title_map"), icon: MapIcon, page: "map" },
    {
      name: t("navigation_title_radioConfig"),
      icon: SettingsIcon,
      page: "config",
    },
    {
      name: t("navigation_title_channels"),
      icon: LayersIcon,
      page: "channels",
    },
    {
      name: `${t("navigation_title_nodes")} (${
        Math.max(getNodesLength() - 1, 0)
      })`,
      icon: UsersIcon,
      page: "nodes",
    },
  ];

  return (
    <div
      className={cn(
        "relative border-slate-300 dark:border-slate-700",
        "transition-all duration-300 ease-in-out flex-shrink-0",
        isCollapsed ? "w-24" : "w-46 lg:w-64",
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
          src="Logo.svg"
          alt={t("sidebar_app_title_alt")}
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
          {t("common_header")}
        </h2>
      </div>

      <SidebarSection label={t("navigation_title")} className="mt-4 px-0">
        {pages.map((link) => (
          <SidebarButton
            key={link.name}
            count={link.count}
            label={link.name}
            Icon={link.icon}
            onClick={() => {
              if (myNode !== undefined) {
                setActivePage(link.page);
              }
            }}
            active={link.page === activePage}
            disabled={myNode === undefined}
          />
        ))}
      </SidebarSection>

      <div
        className={cn(
          "flex-1 min-h-0",
          isCollapsed && "overflow-hidden",
        )}
      >
        {children}
      </div>

      <div className="pt-4 border-t-[0.5px] bg-background-primary border-slate-300 dark:border-slate-700 flex-shrink-0">
        {myNode === undefined
          ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Spinner />
              <Subtle
                className={cn(
                  "mt-4 transition-opacity duration-300",
                  isCollapsed ? "opacity-0 invisible" : "opacity-100 visible",
                )}
              >
                {t("common_loading")}
              </Subtle>
            </div>
          )
          : (
            <>
              <div
                className={cn(
                  "flex place-items-center gap-2",
                  isCollapsed && "justify-center",
                )}
              >
                <Avatar
                  text={myNode.user?.shortName ?? myNode.num.toString()}
                  className={cn("flex-shrink-0 ml-2", isCollapsed && "ml-0")}
                  size="sm"
                />
                <p
                  className={cn(
                    "max-w-[20ch] text-wrap text-sm font-medium",
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    isCollapsed
                      ? "opacity-0 max-w-0 invisible"
                      : "opacity-100 max-w-full visible",
                  )}
                >
                  {myNode.user?.longName}
                </p>
              </div>

              <div
                className={cn(
                  "flex flex-col gap-0.5 ml-2 mt-2",
                  "transition-all duration-300 ease-in-out",
                  isCollapsed
                    ? "opacity-0 max-w-0 h-0 invisible"
                    : "opacity-100 max-w-xs h-auto visible",
                )}
              >
                <div className="inline-flex gap-2">
                  <BatteryStatus deviceMetrics={myNode.deviceMetrics} />
                </div>
                <div className="inline-flex gap-2">
                  <ZapIcon
                    size={18}
                    className="text-gray-500 dark:text-gray-400 w-4 flex-shrink-0"
                  />
                  <Subtle>
                    {t("sidebar_deviceInfo.volts", {
                      voltage: myNode.deviceMetrics?.voltage?.toPrecision(3) ??
                        t("common_unknown"),
                    })}
                  </Subtle>
                </div>
                <div className="inline-flex gap-2">
                  <CpuIcon
                    size={18}
                    className="text-gray-500 dark:text-gray-400 w-4 flex-shrink-0"
                  />
                  <Subtle>
                    {t("sidebar_deviceInfo.firmwareVersion", {
                      version: myMetadata?.firmwareVersion ??
                        t("common_unknown"),
                    })}
                  </Subtle>
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center flex-shrink-0 ml-2",
                  "transition-all duration-300 ease-in-out",
                  isCollapsed
                    ? "opacity-0 max-w-0 invisible pointer-events-none"
                    : "opacity-100 max-w-xs visible",
                )}
              >
                <button
                  type="button"
                  aria-label={t("sidebar_deviceInfo.button_editDeviceName")}
                  className="p-1 rounded transition-colors cursor-pointer  hover:text-accent"
                  onClick={() => setDialogOpen("deviceName", true)}
                >
                  <PenLine size={22} />
                </button>
                <ThemeSwitcher />
                <button
                  type="button"
                  className="transition-all cursor-pointer hover:text-accent"
                  onClick={() => setCommandPaletteOpen(true)}
                >
                  <SearchIcon />
                </button>
              </div>
            </>
          )}
      </div>
    </div>
  );
};
