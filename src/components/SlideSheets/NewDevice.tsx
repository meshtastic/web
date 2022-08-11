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
import { FiBluetooth, FiTerminal, FiWifi } from "react-icons/fi";

import type { TabType } from "../layout/page/TabbedContent.js";
import { BLE } from "./tabs/connect/BLE.js";
import { HTTP } from "./tabs/connect/HTTP.js";
import { Serial } from "./tabs/connect/Serial.js";

export interface NewDeviceProps {
  open: boolean;
  onClose: () => void;
}

export interface CloseProps {
  close: () => void;
}

export type connType = "http" | "ble" | "serial";

export interface ConnTab extends Omit<TabType, "element"> {
  connType: connType;
  element: ({ close }: CloseProps) => JSX.Element;
}

export const NewDevice = ({ open, onClose }: NewDeviceProps) => {
  const [selectedConnType, setSelectedConnType] = useState<connType>("ble");

  const tabs: ConnTab[] = [
    {
      connType: "ble",
      icon: FiBluetooth,
      name: "BLE",
      element: BLE,
      disabled: !navigator.bluetooth,
    },
    {
      connType: "http",
      icon: FiWifi,
      name: "HTTP",
      element: HTTP,
    },
    {
      connType: "serial",
      icon: FiTerminal,
      name: "Serial",
      element: Serial,
      disabled: !navigator.serial,
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
                isSelected={selectedConnType === TabData.connType}
                onSelect={() => setSelectedConnType(TabData.connType)}
                disabled={TabData.disabled}
              >
                <>
                  <TabData.icon />
                  {TabData.name}
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
            display={selectedConnType === TabData.connType ? "block" : "none"}
          >
            {!TabData.disabled && <TabData.element close={onClose} />}
          </Pane>
        ))}
      </Pane>
    </SideSheet>
  );
};
