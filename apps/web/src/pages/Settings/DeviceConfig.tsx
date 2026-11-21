import { Bluetooth } from "@components/PageComponents/Settings/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Settings/Device/index.tsx";
import { Display } from "@components/PageComponents/Settings/Display.tsx";
import { Network } from "@components/PageComponents/Settings/Network/index.tsx";
import { Position } from "@components/PageComponents/Settings/Position.tsx";
import { Power } from "@components/PageComponents/Settings/Power.tsx";
import { SettingsCard } from "@components/Settings/SettingsCard.tsx";
import { SettingRow } from "@components/UI/SettingRow.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import { useConfigEditor, useSignal } from "@core/kmp/hooks";
import { constantSignal } from "@core/kmp/signals.ts";
import type { Protobuf } from "@core/protobuf.ts";
import { dirtyDeviceTabs } from "@core/settings/dirty.ts";
import type { DeviceSubsectionId } from "@core/settings/registry.ts";
import { useNavigate } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { type ConfigProps, useSettingsTab } from "./sectionProps.ts";

const NO_DIRTY_SECTIONS = constantSignal<readonly string[]>([]);
const NO_STAGED = constantSignal<ReadonlyMap<string, unknown>>(new Map());

export type DeviceTab = {
  key: DeviceSubsectionId;
  labelKey: string;
  /** `config` namespace key of the one-line description. */
  descriptionKey: string;
  element: ComponentType<ConfigProps>;
};

/** Device configuration subsections, in the order of Android's deviceConfigRoutes. */
export const DEVICE_TABS: DeviceTab[] = [
  {
    key: "device",
    labelKey: "page.tabDevice",
    descriptionKey: "sections.deviceRoleDescription",
    element: Device,
  },
  {
    key: "position",
    labelKey: "page.tabPosition",
    descriptionKey: "sections.positionDescription",
    element: Position,
  },
  {
    key: "power",
    labelKey: "page.tabPower",
    descriptionKey: "sections.powerDescription",
    element: Power,
  },
  {
    key: "network",
    labelKey: "page.tabNetwork",
    descriptionKey: "sections.networkDescription",
    element: Network,
  },
  {
    key: "display",
    labelKey: "page.tabDisplay",
    descriptionKey: "sections.displayDescription",
    element: Display,
  },
  {
    key: "bluetooth",
    labelKey: "page.tabBluetooth",
    descriptionKey: "sections.bluetoothDescription",
    element: Bluetooth,
  },
];

/**
 * Subsections this hardware supports: Network needs Wi-Fi or Ethernet,
 * Bluetooth needs Bluetooth. Until metadata arrives every one shows, as on
 * Android.
 */
export function visibleDeviceTabs(
  metadata: Protobuf.Mesh.DeviceMetadata | undefined,
): DeviceTab[] {
  return DEVICE_TABS.filter((tab) => {
    if (!metadata) return true;
    if (tab.key === "network") return metadata.hasWifi || metadata.hasEthernet;
    if (tab.key === "bluetooth") return metadata.hasBluetooth;
    return true;
  });
}

/** The subsection `?tab=` opens, other than the Device form itself. */
export function useDeviceSubsection(): DeviceTab | undefined {
  const tab = useSettingsTab();
  const { metadata } = useDeviceCapabilities();
  return visibleDeviceTabs(metadata).find(
    (candidate) => candidate.key === tab && candidate.key !== "device",
  );
}

/**
 * Device configuration. Without `?tab=` it shows the Device form and a card
 * that opens each other subsection; with one it shows that subsection.
 */
export const DeviceConfig = ({ onFormInit }: ConfigProps) => {
  const editor = useConfigEditor();
  const dirtyRadio = useSignal(editor?.dirtyRadioSections ?? NO_DIRTY_SECTIONS);
  const staged = useSignal(editor?.stagedAdminMessages ?? NO_STAGED);
  const { metadata } = useDeviceCapabilities();
  const subsection = useDeviceSubsection();
  const navigate = useNavigate();
  const { t } = useTranslation("config");

  if (subsection) {
    const Subsection = subsection.element;
    return <Subsection onFormInit={onFormInit} />;
  }

  const dirty = dirtyDeviceTabs(dirtyRadio, staged.keys());
  const others = visibleDeviceTabs(metadata).filter(
    (tab) => tab.key !== "device",
  );

  return (
    <div className="flex flex-col gap-5">
      <Device onFormInit={onFormInit} />
      <SettingsCard
        title={t("settingsLayout.otherDeviceSettings")}
        note={t("settingsLayout.sameLayout")}
      >
        {others.map((tab) => (
          <SettingRow
            key={tab.key}
            kind="button"
            label={t(tab.labelKey)}
            help={t(tab.descriptionKey)}
            dirty={dirty.has(tab.key)}
            actionLabel={t("settingsLayout.open")}
            onAction={() =>
              void navigate({
                to: "/settings/device",
                search: { tab: tab.key },
              })
            }
          />
        ))}
      </SettingsCard>
    </div>
  );
};
