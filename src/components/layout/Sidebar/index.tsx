import type React from "react";
import { useState } from "react";

import {
  ArrayIcon,
  GlobeIcon,
  IconComponent,
  InboxIcon,
  InfoSignIcon,
  LabTestIcon,
  LayersIcon,
  majorScale,
  Pane,
  SettingsIcon,
  Tab,
  Tablist,
} from "evergreen-ui";

import { PeersDialog } from "@components/Dialog/PeersDialog.js";
import { useDevice } from "@core/providers/useDevice.js";
import type { Page } from "@core/stores/deviceStore.js";

import { DeviceCard } from "./DeviceCard.js";

interface NavLink {
  name: string;
  icon: IconComponent;
  page: Page;
  disabled?: boolean;
}

export const Sidebar = (): JSX.Element => {
  const { activePage, setActivePage } = useDevice();
  const [PeersDialogOpen, setPeersDialogOpen] = useState(false);

  const navLinks: NavLink[] = [
    {
      name: "Messages",
      icon: InboxIcon,
      page: "messages",
    },
    {
      name: "Map",
      icon: GlobeIcon,
      page: "map",
    },
    {
      name: "Extensions",
      icon: LabTestIcon,
      page: "extensions",
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
      name: "Info",
      icon: InfoSignIcon,
      page: "info",
    },
  ];

  return (
    <Pane
      display="flex"
      flexDirection="column"
      width="100%"
      flexGrow={1}
      margin={majorScale(3)}
      padding={majorScale(2)}
      borderRadius={majorScale(1)}
      background="white"
      elevation={1}
    >
      <Tablist>
        {navLinks.map((Link) => (
          <Tab
            key={Link.name}
            userSelect="none"
            gap={majorScale(2)}
            disabled={Link.disabled}
            direction="vertical"
            isSelected={Link.page === activePage}
            onSelect={() => {
              setActivePage(Link.page);
            }}
          >
            <Link.icon />
            {Link.name}
          </Tab>
        ))}
        <Tab
          userSelect="none"
          gap={5}
          direction="vertical"
          isSelected={PeersDialogOpen}
          onSelect={() => {
            setPeersDialogOpen(true);
          }}
        >
          <ArrayIcon />
          Peers
        </Tab>
      </Tablist>
      <PeersDialog
        isOpen={PeersDialogOpen}
        close={() => {
          setPeersDialogOpen(false);
        }}
      />
      <Pane display="flex" flexGrow={1}>
        <DeviceCard />
      </Pane>
    </Pane>
  );
};
