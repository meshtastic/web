import { DeviceMetadata } from "@buf/meshtastic_protobufs.bufbuild_es/meshtastic/mesh_pb";
import { SidebarSection } from "@components/UI/Sidebar/SidebarSection.js";
import { SidebarButton } from "@components/UI/Sidebar/sidebarButton.js";
import { Subtle } from "@components/UI/Typography/Subtle.js";
import { useDevice } from "@core/stores/deviceStore.js";
import type { Page } from "@core/stores/deviceStore.js";
import {
  EditIcon,
  LayersIcon,
  LucideIcon,
  MapIcon,
  MessageSquareIcon,
  SettingsIcon,
  UsersIcon,
  ZapIcon,
  BatteryMediumIcon,
  CpuIcon
} from "lucide-react";

export interface SidebarProps {
  children?: React.ReactNode;
}

export const Sidebar = ({ children }: SidebarProps): JSX.Element => {
  const { hardware, nodes, metadata } = useDevice();
  const myNode = nodes.get(hardware.myNodeNum);
  const myMetadata = metadata.get(hardware.myNodeNum);
  const { activePage, setActivePage, setDialogOpen } = useDevice();

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
      name: "Nodes",
      icon: UsersIcon,
      page: "nodes",
    },
  ];

  return (
    <div className="min-w-[280px] max-w-min flex-col overflow-y-auto border-r-[0.5px] border-slate-300 bg-transparent dark:border-slate-700">
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
      </div>
      <div className="px-8 pb-6">
        <div className="flex items-center">
            <BatteryMediumIcon size={24} viewBox={'0 0 28 24'}/>
            <Subtle>{myNode?.deviceMetrics?.batteryLevel ?? "UNK"}%</Subtle>
        </div>
        <div className="flex items-center">
            <ZapIcon size={24} viewBox={'0 0 36 24'}/>
            <Subtle>{myNode?.deviceMetrics?.voltage.toPrecision(3) ?? "UNK"} volts</Subtle>
        </div>
        <div className="flex items-center">
            <CpuIcon size={24} viewBox={'0 0 36 24'}/>
            <Subtle>{ myMetadata?.firmwareVersion ?? "UNK"}</Subtle>
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
  );
};

