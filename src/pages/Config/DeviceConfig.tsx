import type React from "react";
import { useState } from "react";

import { Pane, Tab, Tablist } from "evergreen-ui";

import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.js";
import { Device } from "@components/PageComponents/Config/Device.js";
import { Display } from "@components/PageComponents/Config/Display.js";
import { LoRa } from "@components/PageComponents/Config/LoRa.js";
import { Position } from "@components/PageComponents/Config/Position.js";
import { Power } from "@components/PageComponents/Config/Power.js";
import { User } from "@components/PageComponents/Config/User.js";
import { WiFi } from "@components/PageComponents/Config/WiFi.js";
import { useDevice } from "@core/providers/useDevice.js";

export const DeviceConfig = (): JSX.Element => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { hardware } = useDevice();

  const configSections = [
    {
      label: "User",
      element: User,
    },
    {
      label: "Device",
      element: Device,
    },
    {
      label: "Position",
      element: Position,
    },
    {
      label: "Power",
      element: Power,
    },
    {
      label: "WiFi",
      element: WiFi,
      disabled: !hardware.hasWifi,
    },
    {
      label: "Display",
      element: Display,
    },
    {
      label: "LoRa",
      element: LoRa,
    },
    {
      label: "Bluetooth",
      element: Bluetooth,
    },
  ];

  return (
    <Pane display="flex">
      <Pane flexBasis={150} marginRight={24}>
        <Tablist>
          {configSections.map((Config, index) => (
            <Tab
              key={index}
              direction="vertical"
              isSelected={index === selectedIndex}
              onSelect={() => setSelectedIndex(index)}
              disabled={Config.disabled}
            >
              {Config.label}
            </Tab>
          ))}
        </Tablist>
      </Pane>
      <Pane flex="1">
        {configSections.map((Config, index) => (
          <Pane
            key={index}
            display={index === selectedIndex ? "block" : "none"}
          >
            <Config.element />
          </Pane>
        ))}
      </Pane>
    </Pane>
  );
};
