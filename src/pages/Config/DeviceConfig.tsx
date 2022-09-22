import type React from "react";
import { Fragment } from "react";

import { Network } from "@app/components/PageComponents/Config/Network.js";
import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.js";
import { Device } from "@components/PageComponents/Config/Device.js";
import { Display } from "@components/PageComponents/Config/Display.js";
import { LoRa } from "@components/PageComponents/Config/LoRa.js";
import { Position } from "@components/PageComponents/Config/Position.js";
import { Power } from "@components/PageComponents/Config/Power.js";
import { User } from "@components/PageComponents/Config/User.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Tab } from "@headlessui/react";

export const DeviceConfig = (): JSX.Element => {
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
      label: "Network",
      element: Network,
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
