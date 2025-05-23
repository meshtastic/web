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
  const { t } = useTranslation();
  const tabs = [
    {
      label: t("config_module_tab_mqtt"),
      element: MQTT,
    },
    {
      label: t("config_module_tab_serial"),
      element: Serial,
    },
    {
      label: t("config_module_tab_externalNotification"),
      element: ExternalNotification,
    },
    {
      label: t("config_module_tab_storeAndForward"),
      element: StoreForward,
    },
    {
      label: t("config_module_tab_rangeTest"),
      element: RangeTest,
    },
    {
      label: t("config_module_tab_telemetry"),
      element: Telemetry,
    },
    {
      label: t("config_module_tab_cannedMessage"),
      element: CannedMessage,
    },
    {
      label: t("config_module_tab_audio"),
      element: Audio,
    },
    {
      label: t("config_module_tab_neighborInfo"),
      element: NeighborInfo,
    },
    {
      label: t("config_module_tab_ambientLighting"),
      element: AmbientLighting,
    },
    {
      label: t("config_module_tab_detectionSensor"),
      element: DetectionSensor,
    },
    {
      label: t("config_module_tab_paxcounter"),
      element: Paxcounter,
    },
  ];

  return (
    <Tabs defaultValue={t("config_module_tab_mqtt")}>
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
