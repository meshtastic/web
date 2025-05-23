import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.tsx";
import { Device } from "../../components/PageComponents/Config/Device/index.tsx";
import { Display } from "@components/PageComponents/Config/Display.tsx";
import { LoRa } from "@components/PageComponents/Config/LoRa.tsx";
import { Network } from "../../components/PageComponents/Config/Network/index.tsx";
import { Position } from "@components/PageComponents/Config/Position.tsx";
import { Power } from "@components/PageComponents/Config/Power.tsx";
import { Security } from "../../components/PageComponents/Config/Security/Security.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { useTranslation } from "react-i18next";

export const DeviceConfig = () => {
  const { t } = useTranslation();
  const tabs = [
    {
      label: t("config_device_tab_device"),
      element: Device,
      count: 0,
    },
    {
      label: t("config_device_tab_position"),
      element: Position,
    },
    {
      label: t("config_device_tab_power"),
      element: Power,
    },
    {
      label: t("config_device_tab_network"),
      element: Network,
    },
    {
      label: t("config_device_tab_display"),
      element: Display,
    },
    {
      label: t("config_device_tab_lora"),
      element: LoRa,
    },
    {
      label: t("config_device_tab_bluetooth"),
      element: Bluetooth,
    },
    {
      label: t("config_device_tab_security"),
      element: Security,
    },
  ];

  return (
    <Tabs defaultValue={t("config_device_tab_device")}>
      <TabsList className="dark:bg-slate-700">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.label}
            value={tab.label}
            className="dark:text-white"
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
