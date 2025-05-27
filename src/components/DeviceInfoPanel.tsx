import { cn } from "@core/utils/cn.ts";
import {
  CpuIcon,
  Languages,
  LucideIcon,
  Palette,
  PenLine,
  Search as SearchIcon,
  ZapIcon,
} from "lucide-react";
import BatteryStatus from "./BatteryStatus.tsx";
import { Subtle } from "./UI/Typography/Subtle.tsx";
import { Avatar } from "./UI/Avatar.tsx";
import { DeviceMetrics } from "./types.ts";
import { Button } from "./UI/Button.tsx";
import React from "react";
import { useTranslation } from "react-i18next";
import ThemeSwitcher from "./ThemeSwitcher.tsx";
import LanguageSwitcher from "./LanguageSwitcher.tsx";
import { Code } from "./UI/Typography/Code.tsx";

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
  setDialogOpen,
  setCommandPaletteOpen,
  disableHover = false,
}: DeviceInfoPanelProps) => {
  const { t } = useTranslation();
  const { batteryLevel, voltage } = deviceMetrics;

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
      value: voltage !== undefined
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
      id: "changeName",
      label: t("sidebar.deviceInfo.deviceName.changeName"),
      icon: PenLine,
      onClick: setDialogOpen,
    },
    {
      id: "commandMenu",
      label: t("page.title", { ns: "commandPalette" }),
      icon: SearchIcon,
      onClick: setCommandPaletteOpen,
    },
    {
      id: "theme",
      label: t("theme.changeTheme"),
      icon: Palette,
      render: () => <ThemeSwitcher />,
    },
    {
      id: "language",
      label: t("language.changeLanguage"),
      icon: Languages,
      render: () => <LanguageSwitcher />,
    },
  ];

  return (
    <div className="p-1">
      <div className="flex flex-col">
        <div
          className={cn(
            "flex items-center gap-3 p-1",
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
                "transition-opacity duration-300 ease-in-out",
              )}
            >
              {user.longName}
            </p>
          )}
        </div>

        {!isCollapsed && (
          <div className="my-2 h-px bg-gray-200 dark:bg-gray-700"></div>
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
              <div
                key={item.id}
                className="flex items-center gap-2.5 text-sm"
              >
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
          <div className="my-2 h-px bg-gray-200 dark:bg-gray-700"></div>
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
              return buttonItem.render();
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
          {/* <Code>{import.meta.env.COMMIT_HASH}</Code> */}
        </div>
      </div>
    </div>
  );
};
