import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.tsx";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import type { Page } from "@core/stores/deviceStore.ts";
import {
  BatteryMediumIcon,
  CpuIcon,
  EditIcon,
  LayersIcon,
  type LucideIcon,
  MapIcon,
  MessageSquareIcon,
  SettingsIcon,
  SidebarCloseIcon,
  SidebarOpenIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";

export interface SidebarProps {
  children?: React.ReactNode;
}

export const Sidebar = ({ children }: SidebarProps) => {
  const { hardware, nodes, metadata } = useDevice();
  const myNode = nodes.get(hardware.myNodeNum);
  const myMetadata = metadata.get(0);
  const { activePage, setActivePage, setDialogOpen } = useDevice();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  interface NavLink {
    name: string;
    icon: LucideIcon;
    page: Page;
  }

  const pages: NavLink[] = [
    {
      name: "Messages",
      icon: MessageSquareIcon,
      page: "messages",
    },
    {
      name: "Map",
      icon: MapIcon,
      page: "map",
    },
    {
      name: "Config",
      icon: SettingsIcon,
      page: "config",
    },
    {
      name: "Channels",
      icon: LayersIcon,
      page: "channels",
    },
    {
      name: `Nodes (${nodes.size - 1})`,
      icon: UsersIcon,
      page: "nodes",
    },
  ];

  return showSidebar
    ? (
      <div className="min-w-[280px] max-w-min flex-col overflow-y-auto border-r-[0.5px] bg-background-primary border-slate-300 dark:border-slate-400">
        <div className="flex justify-between px-8 pt-6">
          <div>
            <span className="text-lg font-medium">
              {myNode?.user?.shortName ?? "UNK"}
            </span>
            <Subtle>{myNode?.user?.longName ?? "UNK"}</Subtle>
          </div>
          <button
            type="button"
            className="transition-all hover:text-accent"
            onClick={() => setDialogOpen("deviceName", true)}
          >
            <EditIcon size={16} />
          </button>
          <button type="button" onClick={() => setShowSidebar(false)}>
            <SidebarCloseIcon size={24} />
          </button>
        </div>
        <div className="px-8 pb-6">
          <div className="flex items-center">
            <BatteryMediumIcon size={24} viewBox="0 0 28 24" />
            <Subtle>
              {myNode?.deviceMetrics?.batteryLevel
                ? myNode?.deviceMetrics?.batteryLevel > 100
                  ? "Charging"
                  : `${myNode?.deviceMetrics?.batteryLevel}%`
                : "UNK"}
            </Subtle>
          </div>
          <div className="flex items-center">
            <ZapIcon size={24} viewBox="0 0 36 24" />
            <Subtle>
              {myNode?.deviceMetrics?.voltage?.toPrecision(3) ?? "UNK"} volts
            </Subtle>
          </div>
          <div className="flex items-center">
            <CpuIcon size={24} viewBox="0 0 36 24" />
            <Subtle>v{myMetadata?.firmwareVersion ?? "UNK"}</Subtle>
          </div>
        </div>

        <SidebarSection label="Navigation">
          {pages.map((link) => (
            <SidebarButton
              key={link.name}
              label={link.name}
              Icon={link.icon}
              onClick={() => {
                setActivePage(link.page);
              }}
              active={link.page === activePage}
            />
          ))}
        </SidebarSection>
        {children}
      </div>
    )
    : (
      <div className="px-1 pt-8 border-r-[0.5px] border-slate-700">
        <button type="button" onClick={() => setShowSidebar(true)}>
          <SidebarOpenIcon size={24} />
        </button>
      </div>
    );
};
