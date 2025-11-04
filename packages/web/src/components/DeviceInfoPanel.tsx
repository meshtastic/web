import type { ConnectionStatus } from "@app/core/stores/deviceStore/types.ts";
import { cn } from "@core/utils/cn.ts";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  CpuIcon,
  Languages,
  type LucideIcon,
  Palette,
  Search as SearchIcon,
  ZapIcon,
} from "lucide-react";
import type React from "react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import BatteryStatus from "./BatteryStatus.tsx";
import LanguageSwitcher from "./LanguageSwitcher.tsx";
import ThemeSwitcher from "./ThemeSwitcher.tsx";
import type { DeviceMetrics } from "./types.ts";
import { Avatar } from "./UI/Avatar.tsx";
import { Button } from "./UI/Button.tsx";
import { Subtle } from "./UI/Typography/Subtle.tsx";

interface DeviceInfoPanelProps {
  isCollapsed: boolean;
  deviceMetrics: DeviceMetrics;
  firmwareVersion: string;
  user: {
    shortName: string;
    longName: string;
  };
  setDialogOpen: () => void;
  setCommandPaletteOpen: () => void;
  disableHover?: boolean;
  connectionStatus?: ConnectionStatus;
  connectionName?: string;
}

interface InfoDisplayItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  customComponent?: React.ReactNode;
  value?: string | number | null;
}

interface ActionButtonConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  render?: () => React.ReactNode;
}

export const DeviceInfoPanel = ({
  deviceMetrics,
  firmwareVersion,
  user,
  isCollapsed,
  setCommandPaletteOpen,
  disableHover = false,
  connectionStatus,
  connectionName,
}: DeviceInfoPanelProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/" });
  const { batteryLevel, voltage } = deviceMetrics;

  const getStatusColor = (status?: ConnectionStatus): string => {
    if (!status) {
      return "bg-gray-400";
    }
    switch (status) {
      case "connected":
        return "bg-emerald-500";
      case "connecting":
        return "bg-amber-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status?: ConnectionStatus): string => {
    if (!status) {
      return t("unknown.notAvailable", "N/A");
    }
    return status;
  };

  const deviceInfoItems: InfoDisplayItem[] = [
    {
      id: "battery",
      label: t("batteryStatus.title"),
      customComponent: <BatteryStatus deviceMetrics={deviceMetrics} />,
      value: batteryLevel !== undefined ? `${batteryLevel}%` : "N/A",
    },
    {
      id: "voltage",
      label: t("batteryVoltage.title"),
      icon: ZapIcon,
      value:
        voltage !== undefined
          ? `${voltage?.toPrecision(3)} V`
          : t("unknown.notAvailable", "N/A"),
    },
    {
      id: "firmware",
      label: t("sidebar.deviceInfo.firmware.title"),
      icon: CpuIcon,
      value: firmwareVersion ?? t("unknown.notAvailable", "N/A"),
    },
  ];

  const actionButtons: ActionButtonConfig[] = [
    {
      id: "theme",
      label: t("theme.changeTheme"),
      icon: Palette,
      render: () => <ThemeSwitcher />,
    },
    {
      id: "commandMenu",
      label: t("page.title", { ns: "commandPalette" }),
      icon: SearchIcon,
      onClick: setCommandPaletteOpen,
    },

    {
      id: "language",
      label: t("language.changeLanguage"),
      icon: Languages,
      render: () => <LanguageSwitcher />,
    },
  ];

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 p-1 flex-shrink-0",
          isCollapsed && "justify-center",
        )}
      >
        <Avatar
          text={user.shortName}
          className={cn("flex-shrink-0", isCollapsed && "")}
          size="sm"
        />
        {!isCollapsed && (
          <p
            className={cn(
              "text-sm font-medium text-gray-800 dark:text-gray-200",
              "transition-opacity duration-300 ease-in-out truncate",
            )}
          >
            {user.longName}
          </p>
        )}
      </div>

      {connectionStatus && (
        <button
          type="button"
          onClick={() => navigate({ to: "/connections" })}
          aria-label={t("navigation.manageConnections", "Manage connections")}
          className={cn(
            "group flex items-center gap-2 px-1 py-2 flex-shrink-0 rounded-md w-full",
            "transition-colors duration-150",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "focus:outline-none focus:ring-2 focus:ring-accent",
            isCollapsed && "justify-center",
          )}
        >
          <span
            className={cn(
              "h-2.5 w-2.5 ml-2 rounded-full flex-shrink-0",
              getStatusColor(connectionStatus),
            )}
            aria-hidden="true"
          />
          {!isCollapsed && (
            <>
              <div className="flex flex-col min-w-0 flex-1 text-left">
                <Subtle className="text-xs truncate transition-colors duration-150 group-hover:text-gray-800 dark:group-hover:text-gray-100">
                  {connectionName || "Connection"}
                </Subtle>
                <Subtle className="text-xs capitalize text-gray-500 dark:text-gray-400 transition-colors duration-150">
                  {getStatusLabel(connectionStatus)}
                </Subtle>
              </div>
              <ChevronRight
                size={14}
                className="flex-shrink-0 text-gray-400 dark:text-gray-500 transition-colors duration-150 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              />
            </>
          )}
        </button>
      )}

      {!isCollapsed && (
        <div className="my-2 h-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      )}

      <div
        className={cn(
          "flex flex-col gap-2 mt-1",
          "transition-all duration-300 ease-in-out",
          isCollapsed
            ? "opacity-0 max-w-0 h-0 invisible pointer-events-none"
            : "opacity-100 max-w-xs h-auto visible",
        )}
      >
        {deviceInfoItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <div key={item.id} className="flex items-center gap-2.5 text-sm">
              {IconComponent && (
                <IconComponent
                  size={16}
                  className="text-gray-500 dark:text-gray-400 w-4 flex-shrink-0"
                />
              )}
              {item.customComponent}
              {item.id !== "battery" && (
                <Subtle className="text-gray-600 dark:text-gray-300">
                  {item.label}: {item.value}
                </Subtle>
              )}
            </div>
          );
        })}
      </div>

      {!isCollapsed && (
        <div className="my-2 h-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      )}

      <div
        className={cn(
          "flex flex-col gap-1 mt-1",
          "transition-all duration-300 ease-in-out",
          isCollapsed
            ? "opacity-0 max-w-0 h-0 invisible pointer-events-none"
            : "opacity-100 max-w-xs visible",
        )}
      >
        {actionButtons.map((buttonItem) => {
          const Icon = buttonItem.icon;
          if (buttonItem.render) {
            return (
              <Fragment key={buttonItem.id}>{buttonItem.render()}</Fragment>
            );
          }
          return (
            <Button
              key={buttonItem.id}
              variant="ghost"
              aria-label={buttonItem.label}
              onClick={buttonItem.onClick}
              className={cn(
                "group",
                "flex w-full items-center justify-start text-sm p-1.5 rounded-md",
                "gap-2.5",
                "transition-colors duration-150",
                !disableHover && "hover:bg-gray-100 dark:hover:bg-gray-700",
              )}
            >
              <Icon
                size={16}
                className={cn(
                  "flex-shrink-0 w-4",
                  "text-gray-500 dark:text-gray-400",
                  "transition-colors duration-150",
                  !disableHover &&
                    "group-hover:text-gray-700 dark:group-hover:text-gray-200",
                )}
              />
              <Subtle
                className={cn(
                  "text-sm",
                  "text-gray-600 dark:text-gray-300",
                  "transition-colors duration-150",
                  !disableHover &&
                    "group-hover:text-gray-800 dark:group-hover:text-gray-100",
                )}
              >
                {buttonItem.label}
              </Subtle>
            </Button>
          );
        })}
      </div>
    </>
  );
};
