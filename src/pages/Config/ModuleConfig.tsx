import { AmbientLighting } from "@components/PageComponents/ModuleConfig/AmbientLighting.tsx";
import { DetectionSensor } from "@components/PageComponents/ModuleConfig/DetectionSensor.tsx";
import { NeighborInfo } from "@components/PageComponents/ModuleConfig/NeighborInfo.tsx";
import { Audio } from "@components/PageComponents/ModuleConfig/Audio.tsx";
import { CannedMessage } from "@components/PageComponents/ModuleConfig/CannedMessage.tsx";
import { ExternalNotification } from "@components/PageComponents/ModuleConfig/ExternalNotification.tsx";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.tsx";
import { Paxcounter } from "@components/PageComponents/ModuleConfig/Paxcounter.tsx";
import { RangeTest } from "@components/PageComponents/ModuleConfig/RangeTest.tsx";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.tsx";
import { StoreForward } from "@components/PageComponents/ModuleConfig/StoreForward.tsx";
import { Telemetry } from "@components/PageComponents/ModuleConfig/Telemetry.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { useTranslation } from "react-i18next";

export const ModuleConfig = () => {
  const { t } = useTranslation("moduleConfig");
  const tabs = [
    {
      label: t("page.tabMqtt"),
      element: MQTT,
    },
    {
      label: t("page.tabSerial"),
      element: Serial,
    },
    {
      label: t("page.tabExternalNotification"),
      element: ExternalNotification,
    },
    {
      label: t("page.tabStoreAndForward"),
      element: StoreForward,
    },
    {
      label: t("page.tabRangeTest"),
      element: RangeTest,
    },
    {
      label: t("page.tabTelemetry"),
      element: Telemetry,
    },
    {
      label: t("page.tabCannedMessage"),
      element: CannedMessage,
    },
    {
      label: t("page.tabAudio"),
      element: Audio,
    },
    {
      label: t("page.tabNeighborInfo"),
      element: NeighborInfo,
    },
    {
      label: t("page.tabAmbientLighting"),
      element: AmbientLighting,
    },
    {
      label: t("page.tabDetectionSensor"),
      element: DetectionSensor,
    },
    {
      label: t("page.tabPaxcounter"),
      element: Paxcounter,
    },
  ];

  return (
    <Tabs defaultValue={t("page.tabMqtt")}>
      <TabsList className="dark:bg-slate-800">
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
