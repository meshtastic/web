import type { ComponentType, SVGProps } from "react";
import { useDevice } from "@core/providers/useDevice.js";
import type { Page } from "@core/stores/deviceStore.js";
import {
  BeakerIcon,
  ChatBubbleBottomCenterTextIcon,
  Cog8ToothIcon,
  MapIcon,
  Square3Stack3DIcon,
  UsersIcon
} from "@heroicons/react/24/outline";

interface NavLink {
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  page: Page;
}

export const pages: NavLink[] = [
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

export const pagesSetup: NavLink[] = [
  {
    name: "Setup",
    icon: BeakerIcon,
    page: "setup"
  },
  {
    name: "Config",
    icon: Cog8ToothIcon,
    page: "config"
  }
];

export interface TODORenameThisPageNavPages {
  p: NavLink[]
}

export const PageNav = ({p}: TODORenameThisPageNavPages): JSX.Element => {
  const { activePage, setActivePage } = useDevice();  

  return (
    <div className="flex text-textPrimary">
      {p.map((Link) => (
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
