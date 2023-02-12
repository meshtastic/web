import { useDevice } from "@core/stores/deviceStore.js";
import type { Page } from "@core/stores/deviceStore.js";
import {
  LucideIcon,
  MapIcon,
  MessageSquareIcon,
  SettingsIcon,
  LayersIcon,
  UsersIcon,
  EditIcon,
  LayoutGrid
} from "lucide-react";
import { Subtle } from "./UI/Typography/Subtle.js";
import { Button } from "./UI/Button.js";
import { SidebarSection } from "./UI/Sidebar/SidebarSection.js";
import { SidebarButton } from "./UI/Sidebar/sidebarButton.js";

export interface SidebarProps {
  children?: React.ReactNode;
}

export const Sidebar = ({ children }: SidebarProps): JSX.Element => {
  const { hardware, nodes } = useDevice();
  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);
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
      page: "messages"
    },
    {
      name: "Map",
      icon: MapIcon,
      page: "map"
    },
    {
      name: "Config",
      icon: SettingsIcon,
      page: "config"
    },
    {
      name: "Channels",
      icon: LayersIcon,
      page: "channels"
    },
    {
      name: "Peers",
      icon: UsersIcon,
      page: "peers"
    }
  ];

  return (
    <div className="min-w-[280px] max-w-min flex-col border-r-[0.5px] border-slate-300 bg-transparent dark:border-slate-700">
      <div className="flex justify-between px-8 py-6">
        <div>
          <span className="text-lg font-medium">
            {myNode?.data.user?.shortName ?? "UNK"}
          </span>
          <Subtle>{myNode?.data.user?.longName ?? "UNK"}</Subtle>
        </div>
        <button
          className="transition-all hover:text-accent"
          onClick={() => setDialogOpen("deviceName", true)}
        >
          <EditIcon size={16} />
        </button>
      </div>

      <SidebarSection label="Navigation">
        {pages.map((link) => (
          <SidebarButton
            key={link.page}
            label={link.name}
            icon={link.icon}
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
