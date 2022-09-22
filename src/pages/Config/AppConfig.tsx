import type React from "react";
import { Fragment } from "react";

import { ExternalNotification } from "@components/PageComponents/ModuleConfig/ExternalNotification.js";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.js";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.js";
import { Tab } from "@headlessui/react";

export const AppConfig = (): JSX.Element => {
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
    <Tab.Group as="div" className="flex w-full gap-3">
      <Tab.List className="flex w-44 flex-col gap-1">
        {configSections.map((Config, index) => (
          <Tab key={index} as={Fragment}>
            {({ selected }) => (
              <div
                className={`flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium ${
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
