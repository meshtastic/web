import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import type { ValidModuleConfigType } from "@features/settings/components/types.ts";
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
import { useMyNode } from "@shared/hooks";
import { type ComponentType, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { useSettingsNavigation } from "../search/index.ts";

type TabItem = {
  case: ValidModuleConfigType;
  label: string;
  description: string;
  element: ComponentType;
};

export const ModuleConfig = () => {
  const { myNodeNum } = useMyNode();
  const { hasVariantChanges } = usePendingChanges(myNodeNum);
  const { t } = useTranslation("moduleConfig");
  const { activeTab, setActiveTab } = useSettingsNavigation();

  const tabs: TabItem[] = useMemo(
    () => [
      {
        case: "mqtt",
        label: t("page.mqtt"),
        description: t("mqtt.description"),
        element: MQTT,
      },
      {
        case: "serial",
        label: t("page.serial"),
        description: t("serial.description"),
        element: Serial,
      },
      {
        case: "externalNotification",
        label: t("page.externalNotification"),
        description: t("externalNotification.description"),
        element: ExternalNotification,
      },
      {
        case: "storeForward",
        label: t("page.storeAndForward"),
        description: t("storeForward.description"),
        element: StoreForward,
      },
      {
        case: "rangeTest",
        label: t("page.rangeTest"),
        description: t("rangeTest.description"),
        element: RangeTest,
      },
      {
        case: "telemetry",
        label: t("page.telemetry"),
        description: t("telemetry.description"),
        element: Telemetry,
      },
      {
        case: "cannedMessage",
        label: t("page.cannedMessage"),
        description: t("cannedMessage.description"),
        element: CannedMessage,
      },
      {
        case: "audio",
        label: t("page.audio"),
        description: t("audio.description"),
        element: Audio,
      },
      {
        case: "neighborInfo",
        label: t("page.neighborInfo"),
        description: t("neighborInfo.description"),
        element: NeighborInfo,
      },
      {
        case: "ambientLighting",
        label: t("page.ambientLighting"),
        description: t("ambientLighting.description"),
        element: AmbientLighting,
      },
      {
        case: "detectionSensor",
        label: t("page.detectionSensor"),
        description: t("detectionSensor.description"),
        element: DetectionSensor,
      },
      {
        case: "paxcounter",
        label: t("page.paxcounter"),
        description: t("paxcounter.description"),
        element: Paxcounter,
      },
    ],
    [t],
  );

  const flags = useMemo(
    () =>
      new Map(
        tabs.map((tab) => [
          tab.case,
          hasVariantChanges("moduleConfig", tab.case),
        ]),
      ),
    [tabs, hasVariantChanges],
  );

  // Default to first tab if active tab doesn't match any tab
  const currentTab = tabs.find((tab) => tab.case === activeTab)
    ? activeTab
    : (tabs[0]?.case ?? "mqtt");

  return (
    <div className="grid grid-cols-1 gap-6">
      <Tabs value={currentTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full">
          {tabs.map((tab) => (
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
        {tabs.map((tab) => (
          <TabsContent key={tab.case} value={tab.case}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <tab.element />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
