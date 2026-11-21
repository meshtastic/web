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
import { SettingsCard } from "@components/Settings/SettingsCard.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import type {
  ConfigEditor,
  ModuleConfigSection,
  RadioConfig,
} from "@core/kmp/configEditor.ts";
import { useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import { Protobuf } from "@core/protobuf.ts";
import { dirtyModuleTabs } from "@core/settings/dirty.ts";
import { moduleState } from "@core/settings/moduleState.ts";
import { useDevice } from "@core/stores";
import { isModuleExcluded } from "@core/utils/excludedModules.ts";
import { useNavigate } from "@tanstack/react-router";
import { type ComponentType, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type ConfigProps, useSettingsTab } from "./sectionProps.ts";

const NO_DIRTY_SECTIONS = constantSignal<readonly string[]>([]);
const NO_STAGED = constantSignal<ReadonlyMap<string, unknown>>(new Map());
type ModuleConfigValues = ConfigEditor["modules"]["value"];

const NO_RADIO = constantSignal<RadioConfig>({});
const NO_MODULES = constantSignal<ModuleConfigValues>({});

export type ModuleTab = {
  key: ModuleConfigSection;
  labelKey: string;
  element: ComponentType<ConfigProps>;
};

/**
 * Module configuration, in the order of Android's ModuleRoute. Status
 * Message is not a tab: like Android, its one field lives on the User page.
 */
export const MODULE_TABS: ModuleTab[] = [
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

const TAK_ROLES: Protobuf.Config.Config_DeviceConfig_Role[] = [
  Protobuf.Config.Config_DeviceConfig_Role.TAK,
  Protobuf.Config.Config_DeviceConfig_Role.TAK_TRACKER,
];

/** Modules this node offers, in list order. */
function useVisibleModules(): ModuleTab[] {
  const editor = useConfigEditor();
  const radio = useSignal(editor?.radio ?? NO_RADIO);
  const { getEffectiveConfig } = useDevice();
  const { excludedModules, supportsFirmware28 } = useDeviceCapabilities();

  // Staged role first, so TAK appears as soon as the role is set.
  const role = (radio.device ?? getEffectiveConfig("device"))?.role;
  // Like Android, TAK needs firmware 2.8 and a TAK role.
  const showTak =
    supportsFirmware28 && role !== undefined && TAK_ROLES.includes(role);

  // Hide the modules this firmware build was compiled without.
  return useMemo(
    () =>
      MODULE_TABS.filter(
        (tab) =>
          !isModuleExcluded(excludedModules, tab.key) &&
          (tab.key !== "tak" || showTak),
      ),
    [excludedModules, showTak],
  );
}

/** The module `?tab=` opens, if this node offers it. */
export function useModuleSubsection(): ModuleTab | undefined {
  const tab = useSettingsTab();
  const modules = useVisibleModules();
  return modules.find((candidate) => candidate.key === tab);
}

/**
 * Module configuration: a list of the node's modules with their on/off
 * state; `?tab=<module>` opens that module's settings.
 */
export const ModuleConfig = ({ onFormInit }: ConfigProps) => {
  const editor = useConfigEditor();
  const dirtyModule = useSignal(
    editor?.dirtyModuleSections ?? NO_DIRTY_SECTIONS,
  );
  const staged = useSignal(editor?.stagedAdminMessages ?? NO_STAGED);
  const working = useSignal(editor?.modules ?? NO_MODULES);
  const { moduleConfig } = useDevice();
  const modules = useVisibleModules();
  const subsection = useModuleSubsection();
  const navigate = useNavigate();
  const { t } = useTranslation("moduleConfig");

  if (subsection) {
    const Module = subsection.element;
    return <Module onFormInit={onFormInit} />;
  }

  const dirty = dirtyModuleTabs(dirtyModule, staged.keys());
  // The working copy holds edits; the device store fills in modules the
  // editor hasn't loaded yet.
  const current: ModuleConfigValues = { ...moduleConfig, ...working };

  return (
    <SettingsCard title={t("settingsLayout.modules", { ns: "config" })}>
      {modules.map((tab) => {
        const state = moduleState(tab.key, current);
        const actionLabel =
          state === "on"
            ? t("settingsLayout.moduleOn", { ns: "config" })
            : state === "off"
              ? t("settingsLayout.moduleOff", { ns: "config" })
              : t("settingsLayout.moduleConfigure", { ns: "config" });
        return (
          <SettingRow
            key={tab.key}
            kind="button"
            label={t(tab.labelKey)}
            help={t(`summary.${tab.key}`)}
            dirty={dirty.has(tab.key)}
            actionLabel={actionLabel}
            onAction={() =>
              void navigate({
                to: "/settings/module",
                search: { tab: tab.key },
              })
            }
          />
        );
      })}
    </SettingsCard>
  );
};
