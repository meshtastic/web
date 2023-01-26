import type React from "react";
import type { SVGProps } from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import type { Page } from "@app/core/stores/deviceStore.js";
import {
  BeakerIcon,
  ChatBubbleBottomCenterTextIcon,
  Cog8ToothIcon,
  MapIcon,
  Square3Stack3DIcon,
  UsersIcon
} from "@heroicons/react/24/outline";

export const PageNav = (): JSX.Element => {
  const { activePage, setActivePage } = useDevice();

  interface NavLink {
    name: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    page: Page;
  }

  const pages: NavLink[] = [
    {
      name: "Messages",
      icon: ChatBubbleBottomCenterTextIcon,
      page: "messages"
    },
    {
      name: "Map",
      icon: MapIcon,
      page: "map"
    },
    {
      name: "Extensions",
      icon: BeakerIcon,
      page: "extensions"
    },
    {
      name: "Config",
      icon: Cog8ToothIcon,
      page: "config"
    },
    {
      name: "Channels",
      icon: Square3Stack3DIcon,
      page: "channels"
    },
    {
      name: "Peers",
      icon: UsersIcon,
      page: "peers"
    }
  ];

  return (
    <div className="flex text-textPrimary">
      {pages.map((Link) => (
        <div
          key={Link.name}
          onClick={() => {
            setActivePage(Link.page);
          }}
          className={`border-x-4 border-backgroundPrimary bg-backgroundPrimary py-5 px-4 hover:brightness-hover active:brightness-press ${
            Link.page === activePage
              ? "border-l-accent text-textPrimary"
              : "text-textSecondary hover:text-textPrimary"
          }`}
        >
          <Link.icon className="w-4" />
        </div>
      ))}
    </div>
  );
};
