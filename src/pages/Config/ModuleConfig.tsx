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
import {
  useDevice,
  type ValidModuleConfigType,
} from "@core/stores/deviceStore.ts";
import { useMemo } from "react";
import type { ComponentType } from "react";
import type { UseFormReturn } from "react-hook-form";

interface ConfigProps {
  // We can get rid of this exception if we import every config schema and pass the union type
  // deno-lint-ignore no-explicit-any
  onFormInit: (methods: UseFormReturn<any>) => void;
}
type TabItem = {
  case: ValidModuleConfigType;
  label: string;
  element: ComponentType<ConfigProps>;
  count?: number;
};

export const ModuleConfig = ({ onFormInit }: ConfigProps) => {
  const { getWorkingModuleConfig } = useDevice();
  const { t } = useTranslation("moduleConfig");
  const tabs: TabItem[] = [
    {
      case: "mqtt",
      label: t("page.tabMqtt"),
      element: MQTT,
    },
    {
      case: "serial",
      label: t("page.tabSerial"),
      element: Serial,
    },
    {
      case: "externalNotification",
      label: t("page.tabExternalNotification"),
      element: ExternalNotification,
    },
    {
      case: "storeForward",
      label: t("page.tabStoreAndForward"),
      element: StoreForward,
    },
    {
      case: "rangeTest",
      label: t("page.tabRangeTest"),
      element: RangeTest,
    },
    {
      case: "telemetry",
      label: t("page.tabTelemetry"),
      element: Telemetry,
    },
    {
      case: "cannedMessage",
      label: t("page.tabCannedMessage"),
      element: CannedMessage,
    },
    {
      case: "audio",
      label: t("page.tabAudio"),
      element: Audio,
    },
    {
      case: "neighborInfo",
      label: t("page.tabNeighborInfo"),
      element: NeighborInfo,
    },
    {
      case: "ambientLighting",
      label: t("page.tabAmbientLighting"),
      element: AmbientLighting,
    },
    {
      case: "detectionSensor",
      label: t("page.tabDetectionSensor"),
      element: DetectionSensor,
    },
    { case: "paxcounter", label: t("page.tabPaxcounter"), element: Paxcounter },
  ] as const;

  const flags = useMemo(
    () =>
      new Map(tabs.map((tab) => [tab.case, getWorkingModuleConfig(tab.case)])),
    [tabs, getWorkingModuleConfig],
  );

  return (
    <Tabs defaultValue={t("page.tabMqtt")}>
      <TabsList className="dark:bg-slate-800">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.label}
            value={tab.label}
            className="dark:text-white relative"
          >
            {tab.label}
            {flags.get(tab.case) && (
              <span className="absolute -top-0.5 -right-0.5 z-50 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-25">
                </span>
                <span className="relative inline-flex size-3 rounded-full bg-sky-500">
                </span>
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.label} value={tab.label}>
          <tab.element onFormInit={onFormInit} />
        </TabsContent>
      ))}
    </Tabs>
  );
};
