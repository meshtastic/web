import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import type { Page } from "@app/core/stores/deviceStore.js";
import {
  BeakerIcon,
  Cog8ToothIcon,
  IdentificationIcon,
  InboxIcon,
  MapIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";

export const PageNav = (): JSX.Element => {
  const { activePage, setActivePage } = useDevice();

  interface NavLink {
    name: string;
    icon: JSX.Element;
    page: Page;
  }

  const pages: NavLink[] = [
    {
      name: "Messages",
      icon: <InboxIcon />,
      page: "messages",
    },
    {
      name: "Map",
      icon: <MapIcon />,
      page: "map",
    },
    {
      name: "Extensions",
      icon: <BeakerIcon />,
      page: "extensions",
    },
    {
      name: "Config",
      icon: <Cog8ToothIcon />,
      page: "config",
    },
    {
      name: "Channels",
      icon: <Square3Stack3DIcon />,
      page: "channels",
    },
    {
      name: "Info",
      icon: <IdentificationIcon />,
      page: "info",
    },
  ];

  return (
    <div className="flex bg-slate-50 w-12 items-center whitespace-nowrap py-4 text-sm [writing-mode:vertical-rl] h-full border-r border-slate-200 flex-shrink-0">
      <span className="mt-6 flex gap-4 font-bold text-slate-500">
        {pages.map((Link) => (
          <div
            key={Link.name}
            onClick={() => {
              setActivePage(Link.page);
            }}
            className={`w-8 h-8 p-1 border-2 rounded-md hover:border-orange-300 cursor-pointer ${
              Link.page === activePage
                ? "border-orange-400"
                : "border-slate-200"
            }`}
          >
            {Link.icon}
          </div>
        ))}
      </span>
    </div>
  );
};
