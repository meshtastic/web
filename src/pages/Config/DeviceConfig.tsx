import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Config/Device/index.tsx";
import { Display } from "@components/PageComponents/Config/Display.tsx";
import { LoRa } from "@components/PageComponents/Config/LoRa.tsx";
import { Network } from "@components/PageComponents/Config/Network/index.tsx";
import { Position } from "@components/PageComponents/Config/Position.tsx";
import { Power } from "@components/PageComponents/Config/Power.tsx";
import { Security } from "@components/PageComponents/Config/Security/Security.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { useTranslation } from "react-i18next";

export const DeviceConfig = () => {
  const { t } = useTranslation("deviceConfig");
  const tabs = [
    {
      label: t("page.tabDevice"),
      element: Device,
      count: 0,
    },
    {
      label: t("page.tabPosition"),
      element: Position,
    },
    {
      label: t("page.tabPower"),
      element: Power,
    },
    {
      label: t("page.tabNetwork"),
      element: Network,
    },
    {
      label: t("page.tabDisplay"),
      element: Display,
    },
    {
      label: t("page.tabLora"),
      element: LoRa,
    },
    {
      label: t("page.tabBluetooth"),
      element: Bluetooth,
    },
    {
      label: t("page.tabSecurity"),
      element: Security,
    },
  ];

  return (
    <Tabs defaultValue={t("page.tabDevice")}>
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
