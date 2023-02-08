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
import { NavBar } from "@app/Nav/NavBar.js";
import { VerticalTabbedContent } from "@app/components/generic/VerticalTabbedContent.js";

export const DeviceConfig = (): JSX.Element => {
  const { hardware, workingConfig, workingOwner, connection } = useDevice();

  const tabs = [
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
    <div className="flex flex-grow flex-col gap-2">
      <NavBar
        breadcrumb={["Config"]}
        actions={[
          {
            label: "Apply & Reboot",
            async onClick() {
              workingConfig.map(async (config) => {
                await connection?.setConfig(config);
              });
              connection?.setOwner(workingOwner);
              await connection?.commitEditSettings();
            },
          },
        ]}
      />

      <VerticalTabbedContent tabs={tabs} />
    </div>
  );
};
