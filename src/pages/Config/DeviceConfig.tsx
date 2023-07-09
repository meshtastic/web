import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.js";
import { Device } from "@components/PageComponents/Config/Device.js";
import { Display } from "@components/PageComponents/Config/Display.js";
import { LoRa } from "@components/PageComponents/Config/LoRa.js";
import { Network } from "@components/PageComponents/Config/Network.js";
import { Position } from "@components/PageComponents/Config/Position.js";
import { Power } from "@components/PageComponents/Config/Power.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.js";
import { useDevice } from "@core/stores/deviceStore.js";
import { Fragment } from "react";

export const DeviceConfig = (): JSX.Element => {
  const { hardware } = useDevice();

  const tabs = [
    {
      label: "Device",
      element: Device,
      count: 0,
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
    <Tabs defaultValue="Device">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.label}
            value={tab.label}
            disabled={tab.disabled}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.label} value={tab.label}>
          <tab.element />
        </TabsContent>
      ))}
    </Tabs>
  );
};
