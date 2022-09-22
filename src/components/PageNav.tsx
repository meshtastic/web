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
    <div className="flex h-full w-12 flex-shrink-0 items-center whitespace-nowrap border-r border-slate-200 bg-slate-50 py-4 text-sm [writing-mode:vertical-rl]">
      <span className="mt-6 flex gap-4 font-bold text-slate-500">
        {pages.map((Link) => (
          <div
            key={Link.name}
            onClick={() => {
              setActivePage(Link.page);
            }}
            className={`h-8 w-8 cursor-pointer rounded-md border-2 p-1 hover:border-orange-300 ${
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
