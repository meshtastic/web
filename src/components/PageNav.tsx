import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import type { Page } from "@app/core/stores/deviceStore.js";
import {
  BeakerIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  IdentificationIcon,
  InboxIcon,
  MapIcon,
  Square3Stack3DIcon,
  UsersIcon
} from "@heroicons/react/24/outline";

interface PageNavProps {
  pages: NavLink[]
}

export const PageNav = ({pages}: PageNavProps): JSX.Element => {
  const { activePage, setActivePage } = useDevice();

  return (
    <div className="flex h-full flex-shrink-0 whitespace-nowrap bg-backgroundPrimary text-sm [writing-mode:vertical-rl]">
      <span className="mt-2 flex gap-2 font-bold">
        {pages.map((Link) => (
          <div
            key={Link.name}
            onClick={() => {
              setActivePage(Link.page);
            }}
            className={`hover:border-orange-300 h-9 w-9 cursor-pointer border-l-2 p-1.5 ${
              Link.page === activePage
                ? "border-accent text-textPrimary"
                : "border-backgroundPrimary text-textSecondary hover:text-textPrimary"
            }`}
          >
            {Link.icon}
          </div>
        ))}
      </span>
    </div>
  );
};

interface NavLink {
  name: string;
  icon: JSX.Element;
  page: Page;
}  

export const pagesDevice: NavLink[] = [
  {
    name: "Messages",
    icon: <InboxIcon />,
    page: "messages"
  },
  {
    name: "Map",
    icon: <MapIcon />,
    page: "map"
  },
  {
    name: "Extensions",
    icon: <BeakerIcon />,
    page: "extensions"
  },
  {
    name: "Config",
    icon: <Cog8ToothIcon />,
    page: "config"
  },
  {
    name: "Channels",
    icon: <Square3Stack3DIcon />,
    page: "channels"
  },
  {
    name: "Peers",
    icon: <UsersIcon />,
    page: "peers"
  },
  {
    name: "Info",
    icon: <IdentificationIcon />,
    page: "info"
  },
  {
    name: "Logs",
    icon: <DocumentTextIcon />,
    page: "logs"
  }
];

export const pagesSetup: NavLink[] = [
  {
    name: "Setup",
    icon: <BeakerIcon />,
    page: "extensions"
  },
  {
    name: "Config",
    icon: <Cog8ToothIcon />,
    page: "config"
  }
]