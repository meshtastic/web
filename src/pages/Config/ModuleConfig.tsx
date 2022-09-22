import type React from "react";
import { Fragment, useState } from "react";

import { CannedMessage } from "@components/PageComponents/ModuleConfig/CannedMessage";
import { ExternalNotification } from "@components/PageComponents/ModuleConfig/ExternalNotification.js";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.js";
import { RangeTest } from "@components/PageComponents/ModuleConfig/RangeTest.js";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.js";
import { StoreForward } from "@components/PageComponents/ModuleConfig/StoreForward.js";
import { Telemetry } from "@components/PageComponents/ModuleConfig/Telemetry.js";
import { Tab } from "@headlessui/react";

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
    <Tab.Group as="div" className="flex gap-3 w-full">
      <Tab.List className="flex flex-col gap-1 w-44">
        {configSections.map((Config, index) => (
          <Tab key={index} as={Fragment}>
            {({ selected }) => (
              <div
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${
                  selected
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {Config.label}
              </div>
            )}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels as={Fragment}>
        {configSections.map((Config, index) => (
          <Tab.Panel key={index} as={Fragment}>
            <Config.element />
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};
