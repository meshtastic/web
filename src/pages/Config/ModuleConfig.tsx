import { AmbientLighting } from "@app/components/PageComponents/ModuleConfig/AmbientLighting.js";
import { DetectionSensor } from "@app/components/PageComponents/ModuleConfig/DetectionSensor.js";
import { NeighborInfo } from "@app/components/PageComponents/ModuleConfig/NeighborInfo.js";
import { Audio } from "@components/PageComponents/ModuleConfig/Audio.js";
import { CannedMessage } from "@components/PageComponents/ModuleConfig/CannedMessage.js";
import { ExternalNotification } from "@components/PageComponents/ModuleConfig/ExternalNotification.js";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.js";
import { RangeTest } from "@components/PageComponents/ModuleConfig/RangeTest.js";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.js";
import { StoreForward } from "@components/PageComponents/ModuleConfig/StoreForward.js";
import { Telemetry } from "@components/PageComponents/ModuleConfig/Telemetry.js";
import { Paxcounter } from "@components/PageComponents/ModuleConfig/Paxcounter.js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.js";

export const ModuleConfig = (): JSX.Element => {
  const tabs = [
    {
      label: "MQTT",
      element: MQTT,
    },
    {
      label: "Serial",
      element: Serial,
    },
    {
      label: "Ext Notif",
      element: ExternalNotification,
    },
    {
      label: "S&F",
      element: StoreForward,
    },
    {
      label: "Range Test",
      element: RangeTest,
    },
    {
      label: "Telemetry",
      element: Telemetry,
    },
    {
      label: "Canned",
      element: CannedMessage,
    },
    {
      label: "Audio",
      element: Audio,
    },
    {
      label: "Neighbor Info",
      element: NeighborInfo,
    },
    {
      label: "Ambient Lighting",
      element: AmbientLighting,
    },
    {
      label: "Detection Sensor",
      element: DetectionSensor,
    },
    {
      label: "Paxcounter",
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
