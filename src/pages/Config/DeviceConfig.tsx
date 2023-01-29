import { Fragment } from "react";
import { Network } from "@components/PageComponents/Config/Network.js";
import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.js";
import { Device } from "@components/PageComponents/Config/Device.js";
import { Display } from "@components/PageComponents/Config/Display.js";
import { LoRa } from "@components/PageComponents/Config/LoRa.js";
import { Position } from "@components/PageComponents/Config/Position.js";
import { Power } from "@components/PageComponents/Config/Power.js";
import { User } from "@components/PageComponents/Config/User.js";
import { useDevice } from "@core/providers/useDevice.js";
import { Tab } from "@headlessui/react";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";
import { Button } from "@components/form/Button.js";
import { CheckIcon } from "@primer/octicons-react";

export const DeviceConfig = (): JSX.Element => {
  const { hardware, workingConfig, connection } = useDevice();

  const configSections = [
    {
      label: "User",
      element: User
    },
    {
      label: "Device",
      element: Device
    },
    {
      label: "Position",
      element: Position
    },
    {
      label: "Power",
      element: Power
    },
    {
      label: "Network",
      element: Network,
      disabled: !hardware.hasWifi
    },
    {
      label: "Display",
      element: Display
    },
    {
      label: "LoRa",
      element: LoRa
    },
    {
      label: "Bluetooth",
      element: Bluetooth
    }
  ];

  return (
    <div className="w-full">
      <div className="m-2 flex rounded-md bg-backgroundSecondary p-2">
        <ol className="my-auto ml-2 flex gap-4 text-textSecondary">
          <li className="cursor-pointer hover:brightness-disabled">
            <HomeIcon className="h-5 w-5 flex-shrink-0" />
          </li>
          {["Config", "User"].map((breadcrumb, index) => (
            <li key={index} className="flex gap-4">
              <ChevronRightIcon className="h-5 w-5 flex-shrink-0 brightness-disabled" />
              <span className="cursor-pointer text-sm font-medium hover:brightness-disabled">
                {breadcrumb}
              </span>
            </li>
          ))}
        </ol>
        <div className="ml-auto">
          <Button
            onClick={async () => {
              workingConfig.map(async (config) => {
                await connection?.setConfig(config);
              });
              await connection?.commitEditSettings();
            }}
            iconBefore={<CheckIcon className="w-4" />}
          >
            Apply & Reboot
          </Button>
        </div>
      </div>

      <Tab.Group as="div" className="flex w-full gap-3">
        <Tab.List className="flex w-44 flex-col">
          {configSections.map((Config, index) => (
            <Tab key={index} as={Fragment}>
              {({ selected }) => (
                <div
                  className={`flex cursor-pointer items-center border-l-4 p-4 text-sm font-medium ${
                    selected
                      ? "border-accent bg-accentMuted bg-opacity-10 text-textPrimary"
                      : "border-backgroundPrimary text-textSecondary"
                  }`}
                >
                  {Config.label}
                  <span className="ml-auto rounded-full bg-accent px-3 text-textPrimary">
                    3
                  </span>
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
    </div>
  );
};
