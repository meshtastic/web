import { useDevice } from "@core/stores/deviceStore.js";
import type { Page } from "@core/stores/deviceStore.js";
import {
  LucideIcon,
  MapIcon,
  MessageSquareIcon,
  SettingsIcon,
  LayersIcon,
  UsersIcon,
  EditIcon
} from "lucide-react";
import { Subtle } from "./UI/Typography/Subtle.js";
import { SidebarItem } from "./UI/Sidebar/SidebarItem.js";

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
    <div className="min-w-[220px] flex-col border-r-[0.5px] bg-transparent">
      <div className="flex h-16 flex-col justify-center px-4">
        <div className="flex items-center justify-between">
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
      </div>

      <div className="mx-2.5 space-y-2">
        {pages.map((link) => (
          <SidebarItem
            key={link.page}
            label={link.name}
            icon={link.icon}
            active={link.page === activePage}
            onClick={() => {
              setActivePage(link.page);
            }}
          />
        ))}
        {children}
      </div>
    </div>
  );
};
