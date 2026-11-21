import { CountBadge } from "@components/UI/CountBadge.tsx";
import { IconButton, iconButtonVariants } from "@components/UI/IconButton.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { Link } from "@tanstack/react-router";
import { CommandIcon } from "lucide-react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { DeviceMenu } from "./DeviceMenu.tsx";
import { type DeviceSummary, presenceForState } from "./deviceSummary.ts";
import { navIcons } from "./navIcons.ts";
import { navLabelKeys, stateLabelKeys } from "./shellLabels.ts";
import {
  activeDestination,
  type NavDestination,
  navPaths,
  railPrimaryDestinations,
} from "./navItems.ts";

const RailTooltip = ({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="right">{label}</TooltipContent>
  </Tooltip>
);

export interface AppRailProps {
  pathname: string;
  unreadCount: number;
  /** Nodes heard, excluding the connected radio. */
  nodeCount: number;
  device: DeviceSummary;
  onOpenCommandMenu: () => void;
}

/** Desktop icon rail: device, top-level destinations, command menu. */
export const AppRail = ({
  pathname,
  unreadCount,
  nodeCount,
  device,
  onOpenCommandMenu,
}: AppRailProps) => {
  const { t } = useTranslation("ui");
  const active = activeDestination(pathname);

  const tooltipFor = (destination: NavDestination): string =>
    t(navLabelKeys[destination]);
  const accessibleNameFor = (destination: NavDestination): string => {
    switch (destination) {
      case "messages":
        return unreadCount > 0
          ? t("shell.messagesUnread", { count: unreadCount })
          : t(navLabelKeys.messages);
      case "nodes":
        return t("shell.nodesCount", { count: nodeCount });
      case "map":
      case "settings":
        return t(navLabelKeys[destination]);
    }
  };

  const navLink = (destination: NavDestination) => {
    const Icon = navIcons[destination];
    const current = active === destination;
    return (
      <RailTooltip key={destination} label={tooltipFor(destination)}>
        <Link
          to={navPaths[destination]}
          aria-label={accessibleNameFor(destination)}
          aria-current={current ? "page" : undefined}
          className={iconButtonVariants({ variant: "rail", size: "rail" })}
        >
          <Icon aria-hidden="true" className="size-[22px]" />
          {destination === "messages" ? (
            <CountBadge
              count={unreadCount}
              label={null}
              size="sm"
              className="absolute top-1 right-1"
            />
          ) : null}
        </Link>
      </RailTooltip>
    );
  };

  const deviceLabel = t("shell.deviceWithStatus", {
    name: device.name,
    status: t(stateLabelKeys[device.state]),
  });

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label={t("shell.appNavigation")}
        className="flex w-[72px] shrink-0 flex-col items-center gap-2 border-r border-subtle bg-rail py-3"
      >
        <Tooltip>
          <DeviceMenu side="right" align="start">
            <TooltipTrigger asChild>
              <IconButton
                aria-label={deviceLabel}
                size="rail"
                icon={
                  <NodeAvatar
                    initials={device.initials}
                    tone={{ kind: "device" }}
                    size="lg"
                    shape="rounded"
                    presence={presenceForState[device.state]}
                    cutout="rail"
                  />
                }
              />
            </TooltipTrigger>
          </DeviceMenu>
          <TooltipContent side="right">{device.name}</TooltipContent>
        </Tooltip>
        <div aria-hidden="true" className="my-1.5 h-px w-8 bg-raised" />
        {railPrimaryDestinations.map(navLink)}
        <div className="flex-1" />
        <RailTooltip label={t("shell.commandMenu")}>
          <IconButton
            aria-label={t("shell.commandMenu")}
            variant="rail"
            size="rail"
            icon={<CommandIcon className="size-[22px]" />}
            onClick={onOpenCommandMenu}
          />
        </RailTooltip>
        {navLink("settings")}
      </nav>
    </TooltipProvider>
  );
};
