import { AmbientLighting } from "@components/PageComponents/ModuleConfig/AmbientLighting.tsx";
import { Audio } from "@components/PageComponents/ModuleConfig/Audio.tsx";
import { CannedMessage } from "@components/PageComponents/ModuleConfig/CannedMessage.tsx";
import { DetectionSensor } from "@components/PageComponents/ModuleConfig/DetectionSensor.tsx";
import { ExternalNotification } from "@components/PageComponents/ModuleConfig/ExternalNotification.tsx";
import { MeshBeacon } from "@components/PageComponents/ModuleConfig/MeshBeacon.tsx";
import { MQTT } from "@components/PageComponents/ModuleConfig/MQTT.tsx";
import { NeighborInfo } from "@components/PageComponents/ModuleConfig/NeighborInfo.tsx";
import { Paxcounter } from "@components/PageComponents/ModuleConfig/Paxcounter.tsx";
import { RangeTest } from "@components/PageComponents/ModuleConfig/RangeTest.tsx";
import { RemoteHardware } from "@components/PageComponents/ModuleConfig/RemoteHardware.tsx";
import { Serial } from "@components/PageComponents/ModuleConfig/Serial.tsx";
import { StoreForward } from "@components/PageComponents/ModuleConfig/StoreForward.tsx";
import { Tak } from "@components/PageComponents/ModuleConfig/Tak.tsx";
import { Telemetry } from "@components/PageComponents/ModuleConfig/Telemetry.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import type { ValidModuleConfigType } from "@core/stores";
import { isModuleExcluded } from "@core/utils/excludedModules.ts";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { type ComponentType, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  type ConfigProps,
  type SettingsTab,
  SettingsTabs,
} from "./SettingsTabs.tsx";

const EMPTY_DIRTY_MODULE_SIGNAL = {
  value: [] as readonly string[],
  peek: () => [] as readonly string[],
  subscribe: () => () => {},
} as const;

type ModuleTab = {
  key: ValidModuleConfigType;
  labelKey: string;
  element: ComponentType<ConfigProps>;
};

/**
 * Module configuration, in the order of Android's ModuleRoute. Status
 * Message is not a tab: like Android, its one field lives on the User page.
 */
const MODULE_TABS: ModuleTab[] = [
  { key: "mqtt", labelKey: "page.tabMqtt", element: MQTT },
  { key: "serial", labelKey: "page.tabSerial", element: Serial },
  {
    key: "externalNotification",
    labelKey: "page.tabExternalNotification",
    element: ExternalNotification,
  },
  {
    key: "storeForward",
    labelKey: "page.tabStoreAndForward",
    element: StoreForward,
  },
  { key: "rangeTest", labelKey: "page.tabRangeTest", element: RangeTest },
  { key: "telemetry", labelKey: "page.tabTelemetry", element: Telemetry },
  {
    key: "cannedMessage",
    labelKey: "page.tabCannedMessage",
    element: CannedMessage,
  },
  { key: "audio", labelKey: "page.tabAudio", element: Audio },
  {
    key: "remoteHardware",
    labelKey: "page.tabRemoteHardware",
    element: RemoteHardware,
  },
  {
    key: "neighborInfo",
    labelKey: "page.tabNeighborInfo",
    element: NeighborInfo,
  },
  {
    key: "ambientLighting",
    labelKey: "page.tabAmbientLighting",
    element: AmbientLighting,
  },
  {
    key: "detectionSensor",
    labelKey: "page.tabDetectionSensor",
    element: DetectionSensor,
  },
  { key: "paxcounter", labelKey: "page.tabPaxcounter", element: Paxcounter },
  { key: "tak", labelKey: "page.tabTak", element: Tak },
  { key: "meshBeacon", labelKey: "page.tabMeshBeacon", element: MeshBeacon },
];

export const ModuleConfig = ({ onFormInit }: ConfigProps) => {
  const editor = useConfigEditor();
  const dirtyModule = useSignal(
    editor?.dirtyModuleSections ?? EMPTY_DIRTY_MODULE_SIGNAL,
  );
  const { t } = useTranslation("moduleConfig");
  const { excludedModules } = useDeviceCapabilities();

  // Hide the modules this firmware build was compiled without.
  const tabs: SettingsTab[] = useMemo(
    () =>
      MODULE_TABS.filter(
        (tab) => !isModuleExcluded(excludedModules, tab.key),
      ).map((tab) => ({
        key: tab.key,
        label: t(tab.labelKey),
        element: tab.element,
        isDirty: dirtyModule.includes(tab.key),
      })),
    [t, excludedModules, dirtyModule],
  );

  return <SettingsTabs tabs={tabs} onFormInit={onFormInit} />;
};
