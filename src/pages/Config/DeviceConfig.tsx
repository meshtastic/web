import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Config/Device.tsx";
import { Display } from "@components/PageComponents/Config/Display.tsx";
import { LoRa } from "@components/PageComponents/Config/LoRa.tsx";
import { Network } from "@components/PageComponents/Config/Network.tsx";
import { Position } from "@components/PageComponents/Config/Position.tsx";
import { Power } from "@components/PageComponents/Config/Power.tsx";
import { Security } from "@components/PageComponents/Config/Security.tsx";
import { useTranslation } from "react-i18next";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";

export const DeviceConfig = (): JSX.Element => {
  const { metadata } = useDevice();
  const { t } = useTranslation();

  const tabs = [
    {
      label: t("Device"),
      element: Device,
      count: 0,
    },
    {
      label: t("Position"),
      element: Position,
    },
    {
      label: t("Power"),
      element: Power,
    },
    {
      label: t("network"),
      element: Network,
      // disabled: !metadata.get(0)?.hasWifi,
    },
    {
      label: t("Display"),
      element: Display,
    },
    {
      label: t("LoRa"),
      element: LoRa,
    },
    {
      label: t("Bluetooth"),
      element: Bluetooth,
    },
    {
      label: t("Security"),
      element: Security,
    },
  ];

  return (
    <Tabs defaultValue="Device">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.label} value={tab.label}>
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
