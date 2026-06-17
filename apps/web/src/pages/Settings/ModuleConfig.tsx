import { AmbientLighting } from "@components/PageComponents/ModuleConfig/AmbientLighting.tsx";
import { Audio } from "@components/PageComponents/ModuleConfig/Audio.tsx";
import { CannedMessage } from "@components/PageComponents/ModuleConfig/CannedMessage.tsx";
import { DetectionSensor } from "@components/PageComponents/ModuleConfig/DetectionSensor.tsx";
import { ExternalNotification } from "@components/PageComponents/ModuleConfig/ExternalNotification.tsx";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.tsx";
import { NeighborInfo } from "@components/PageComponents/ModuleConfig/NeighborInfo.tsx";
import { Paxcounter } from "@components/PageComponents/ModuleConfig/Paxcounter.tsx";
import { RangeTest } from "@components/PageComponents/ModuleConfig/RangeTest.tsx";
import { RemoteHardware } from "@components/PageComponents/ModuleConfig/RemoteHardware.tsx";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.tsx";
import { StatusMessage } from "@components/PageComponents/ModuleConfig/StatusMessage.tsx";
import { StoreForward } from "@components/PageComponents/ModuleConfig/StoreForward.tsx";
import { Tak } from "@components/PageComponents/ModuleConfig/Tak.tsx";
import { Telemetry } from "@components/PageComponents/ModuleConfig/Telemetry.tsx";
import { TrafficManagement } from "@components/PageComponents/ModuleConfig/TrafficManagement.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import type { ValidModuleConfigType } from "@core/stores";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { type ComponentType, Suspense, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
}

type TabItem = {
  case: ValidModuleConfigType;
  label: string;
  element: ComponentType<ConfigProps>;
  count?: number;
};

const EMPTY_DIRTY_MODULE_SIGNAL = {
  value: [] as readonly string[],
  peek: () => [] as readonly string[],
  subscribe: () => () => {},
} as const;

export const ModuleConfig = ({ onFormInit }: ConfigProps) => {
  const editor = useConfigEditor();
  const dirtyModule = useSignal(
    editor?.dirtyModuleSections ?? EMPTY_DIRTY_MODULE_SIGNAL,
  );
  const { t } = useTranslation("moduleConfig");
  const tabs: TabItem[] = useMemo(
    () => [
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
      {
        case: "paxcounter",
        label: t("page.tabPaxcounter"),
        element: Paxcounter,
      },
      {
        case: "remoteHardware",
        label: t("page.tabRemoteHardware"),
        element: RemoteHardware,
      },
      {
        case: "trafficManagement",
        label: t("page.tabTrafficManagement"),
        element: TrafficManagement,
      },
      {
        case: "statusmessage",
        label: t("page.tabStatusMessage"),
        element: StatusMessage,
      },
      { case: "tak", label: t("page.tabTak"), element: Tak },
    ],
    [t],
  );

  const flags = useMemo(
    () =>
      new Map(tabs.map((tab) => [tab.case, dirtyModule.includes(tab.case)])),
    [tabs, dirtyModule],
  );

  return (
    <Tabs defaultValue={t("page.tabMqtt")}>
      <TabsList className="w-full dark:bg-slate-800">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.label}
            value={tab.label}
            className="dark:text-white relative"
          >
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
        <TabsContent key={tab.label} value={tab.label}>
          <Suspense fallback={<Spinner size="lg" className="my-5" />}>
            <tab.element onFormInit={onFormInit} />
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  );
};
