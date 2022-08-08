import type React from "react";
import { useState } from "react";

import { Pane, Tab, Tablist } from "evergreen-ui";

import { ExternalNotification } from "@app/components/PageComponents/ModuleConfig/ExternalNotification.js";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.js";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.js";

export const AppConfig = (): JSX.Element => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const configSections = [
    {
      label: "Interface",
      element: MQTT,
    },
    {
      label: "Logging",
      element: Serial,
    },
    {
      label: "Language",
      element: ExternalNotification,
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
