import type React from "react";
import { useState } from "react";

import {
  Heading,
  majorScale,
  Pane,
  Paragraph,
  SideSheet,
  Tab,
  Tablist,
} from "evergreen-ui";
import type { IconType } from "react-icons";
import { FiBluetooth, FiTerminal, FiWifi } from "react-icons/fi";

import { BLE } from "../connect/BLE.js";
import { HTTP } from "../connect/HTTP.js";
import { Serial } from "../connect/Serial.js";

export interface NewDeviceProps {
  open: boolean;
  onClose: () => void;
}

export interface CloseProps {
  close: () => void;
}

export type connType = "http" | "ble" | "serial";

export interface Tab {
  name: connType;
  icon: IconType;
  displayName: string;
  element: ({ close }: CloseProps) => JSX.Element;
}

export const NewDevice = ({ open, onClose }: NewDeviceProps) => {
  const [selectedConnType, setSelectedConnType] = useState<connType>("ble");

  const tabs: Tab[] = [
    {
      name: "ble",
      icon: FiBluetooth,
      displayName: "BLE",
      element: BLE,
    },
    {
      name: "http",
      icon: FiWifi,
      displayName: "HTTP",
      element: HTTP,
    },
    {
      name: "serial",
      icon: FiTerminal,
      displayName: "Serial",
      element: Serial,
    },
  ];

  return (
    <SideSheet
      isShown={open}
      onCloseComplete={onClose}
      containerProps={{
        display: "flex",
        flex: "1",
        flexDirection: "column",
      }}
    >
      <Pane zIndex={1} flexShrink={0} elevation={1} backgroundColor="white">
        <Pane padding={16} borderBottom="muted">
          <Heading size={600}>Connect new device</Heading>
          <Paragraph size={400} color="muted">
            Optional description or sub title
          </Paragraph>
        </Pane>
        <Pane display="flex" padding={8}>
          <Tablist>
            {tabs.map((TabData, index) => (
              <Tab
                key={index}
                gap={5}
                isSelected={selectedConnType === TabData.name}
                onSelect={() => setSelectedConnType(TabData.name)}
              >
                <>
                  <TabData.icon />
                  {TabData.displayName}
                </>
              </Tab>
            ))}
          </Tablist>
        </Pane>
      </Pane>
      <Pane display="flex" overflowY="scroll" background="tint1" padding={16}>
        {tabs.map((TabData, index) => (
          <Pane
            key={index}
            borderRadius={majorScale(1)}
            backgroundColor="white"
            elevation={1}
            flexGrow={1}
            display={selectedConnType === TabData.name ? "block" : "none"}
          >
            <TabData.element close={onClose} />
          </Pane>
        ))}
      </Pane>
    </SideSheet>
  );
};
