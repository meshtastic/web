import type React from "react";
import { useState } from "react";

import { Pane, Tab, Tablist } from "evergreen-ui";

import { CannedMessage } from "@components/PageComponents/ModuleConfig/CannedMessage";
import { ExternalNotification } from "@components/PageComponents/ModuleConfig/ExternalNotification.js";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.js";
import { RangeTest } from "@components/PageComponents/ModuleConfig/RangeTest.js";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.js";
import { StoreForward } from "@components/PageComponents/ModuleConfig/StoreForward.js";
import { Telemetry } from "@components/PageComponents/ModuleConfig/Telemetry.js";

export const ModuleConfig = (): JSX.Element => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const configSections = [
    {
      label: "MQTT",
      element: MQTT,
    },
    {
      label: "Serial",
      element: Serial,
    },
    {
      label: "External Notification",
      element: ExternalNotification,
    },
    {
      label: "Store & Forward",
      element: StoreForward,
    },
    {
      label: "Range Test",
      element: RangeTest,
    },
    {
      label: "Telemetry",
      element: Telemetry,
    },
    {
      label: "Canned Message",
      element: CannedMessage,
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
