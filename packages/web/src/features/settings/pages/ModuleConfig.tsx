import { AmbientLighting } from "../components/modules/AmbientLighting.tsx";
import { Audio } from "../components/modules/Audio.tsx";
import { CannedMessage } from "../components/modules/CannedMessage.tsx";
import { DetectionSensor } from "../components/modules/DetectionSensor.tsx";
import { ExternalNotification } from "../components/modules/ExternalNotification.tsx";
import { MQTT } from "../components/modules/MQTT.tsx";
import { NeighborInfo } from "../components/modules/NeighborInfo.tsx";
import { Paxcounter } from "../components/modules/Paxcounter.tsx";
import { RangeTest } from "../components/modules/RangeTest.tsx";
import { Serial } from "../components/modules/Serial.tsx";
import { StoreForward } from "../components/modules/StoreForward.tsx";
import { Telemetry } from "../components/modules/Telemetry.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@shared/components/ui/tabs";
import { useDevice, type ValidModuleConfigType } from "@core/stores";
import { type ComponentType, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface ConfigPageProps {
  searchQuery?: string;
}

type TabItem = {
  case: ValidModuleConfigType;
  label: string;
  element: ComponentType;
  count?: number;
};

export const ModuleConfig = ({ searchQuery = "" }: ConfigPageProps) => {
  const { hasModuleConfigChange } = useDevice();
  const { t } = useTranslation("moduleConfig");
  const tabs: TabItem[] = [
    {
      case: "mqtt",
      label: t("page.mqtt"),
      element: MQTT,
    },
    {
      case: "serial",
      label: t("page.serial"),
      element: Serial,
    },
    {
      case: "externalNotification",
      label: t("page.externalNotification"),
      element: ExternalNotification,
    },
    {
      case: "storeForward",
      label: t("page.storeAndForward"),
      element: StoreForward,
    },
    {
      case: "rangeTest",
      label: t("page.rangeTest"),
      element: RangeTest,
    },
    {
      case: "telemetry",
      label: t("page.telemetry"),
      element: Telemetry,
    },
    {
      case: "cannedMessage",
      label: t("page.cannedMessage"),
      element: CannedMessage,
    },
    {
      case: "audio",
      label: t("page.audio"),
      element: Audio,
    },
    {
      case: "neighborInfo",
      label: t("page.neighborInfo"),
      element: NeighborInfo,
    },
    {
      case: "ambientLighting",
      label: t("page.ambientLighting"),
      element: AmbientLighting,
    },
    {
      case: "detectionSensor",
      label: t("page.detectionSensor"),
      element: DetectionSensor,
    },
    {
      case: "paxcounter",
      label: t("page.paxcounter"),
      element: Paxcounter,
    },
  ];

  const flags = useMemo(
    () =>
      new Map(tabs.map((tab) => [tab.case, hasModuleConfigChange(tab.case)])),
    [tabs, hasModuleConfigChange],
  );

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) {
      return tabs;
    }

    const query = searchQuery.toLowerCase();
    return tabs.filter((tab) => tab.label.toLowerCase().includes(query));
  }, [tabs, searchQuery]);

  return (
    <div className="space-y-6">
      {filteredTabs.length === 0 ? (
        <Card className="max-w-7xl">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No modules found matching "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={filteredTabs[0]?.case}>
          <TabsList className="flex w-full">
            {filteredTabs.map((tab) => (
              <TabsTrigger key={tab.case} value={tab.case} className="relative">
                {tab.label}
                {flags.get(tab.case) && (
                  <span className="absolute -top-0.5 -right-0.5 z-50 flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-25" />
                    <span className="relative inline-flex size-3 rounded-full bg-sky-500" />
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {filteredTabs.map((tab) => (
            <TabsContent key={tab.case} value={tab.case}>
              <Card className="max-w-7xl">
                <CardHeader>
                  <CardTitle>{tab.label}</CardTitle>
                  <CardDescription>
                    {tab.case === "mqtt" && t("mqtt.description")}
                    {tab.case === "serial" && t("serial.description")}
                    {tab.case === "externalNotification" &&
                      t("externalNotification.description")}
                    {tab.case === "storeForward" &&
                      t("storeForward.description")}
                    {tab.case === "rangeTest" && t("rangeTest.description")}
                    {tab.case === "telemetry" && t("telemetry.description")}
                    {tab.case === "cannedMessage" &&
                      t("cannedMessage.description")}
                    {tab.case === "audio" && t("audio.description")}
                    {tab.case === "neighborInfo" &&
                      t("neighborInfo.description")}
                    {tab.case === "ambientLighting" &&
                      t("ambientLighting.description")}
                    {tab.case === "detectionSensor" &&
                      t("detectionSensor.description")}
                    {tab.case === "paxcounter" && t("paxcounter.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <tab.element />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};
