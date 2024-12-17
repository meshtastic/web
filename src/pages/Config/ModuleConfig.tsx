import { AmbientLighting } from "@app/components/PageComponents/ModuleConfig/AmbientLighting.tsx";
import { DetectionSensor } from "@app/components/PageComponents/ModuleConfig/DetectionSensor.tsx";
import { NeighborInfo } from "@app/components/PageComponents/ModuleConfig/NeighborInfo.tsx";
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

export const ModuleConfig = (): JSX.Element => {
  const { t } = useTranslation();
  const tabs = [
    {
      label: t("MQTT"),
      element: MQTT,
    },
    {
      label: t("Serial"),
      element: Serial,
    },
    {
      label: t("Ext Notif"),
      element: ExternalNotification,
    },
    {
      label: t("S&F"),
      element: StoreForward,
    },
    {
      label: t("Range Test"),
      element: RangeTest,
    },
    {
      label: t("Telemetry"),
      element: Telemetry,
    },
    {
      label: t("Canned"),
      element: CannedMessage,
    },
    {
      label: t("Audio"),
      element: Audio,
    },
    {
      label: t("Neighbor Info"),
      element: NeighborInfo,
    },
    {
      label: t("Ambient Lighting"),
      element: AmbientLighting,
    },
    {
      label: t("Detection Sensor"),
      element: DetectionSensor,
    },
    {
      label: t("Paxcounter"),
      element: Paxcounter,
    },
  ];

  return (
    <Tabs defaultValue="MQTT">
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
