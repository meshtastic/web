import { Bluetooth } from "@components/PageComponents/Settings/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Settings/Device/index.tsx";
import { Display } from "@components/PageComponents/Settings/Display.tsx";
import { Network } from "@components/PageComponents/Settings/Network/index.tsx";
import { Position } from "@components/PageComponents/Settings/Position.tsx";
import { Power } from "@components/PageComponents/Settings/Power.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import type { ValidConfigType } from "@core/stores";
import type { Protobuf } from "@meshtastic/sdk";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { type ComponentType, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { dirtyDeviceTabs } from "./dirtySections.ts";
import {
  type ConfigProps,
  type SettingsTab,
  SettingsTabs,
} from "./SettingsTabs.tsx";

const EMPTY_DIRTY_RADIO_SIGNAL = {
  value: [] as readonly string[],
  peek: () => [] as readonly string[],
  subscribe: () => () => {},
} as const;

const EMPTY_STAGED_SIGNAL = {
  value: new Map() as ReadonlyMap<string, unknown>,
  peek: () => new Map() as ReadonlyMap<string, unknown>,
  subscribe: () => () => {},
} as const;

type DeviceTab = {
  key: ValidConfigType;
  labelKey: string;
  element: ComponentType<ConfigProps>;
};

/** Device configuration tabs, in the order of Android's deviceConfigRoutes. */
export const DEVICE_TABS: DeviceTab[] = [
  { key: "device", labelKey: "page.tabDevice", element: Device },
  { key: "position", labelKey: "page.tabPosition", element: Position },
  { key: "power", labelKey: "page.tabPower", element: Power },
  { key: "network", labelKey: "page.tabNetwork", element: Network },
  { key: "display", labelKey: "page.tabDisplay", element: Display },
  { key: "bluetooth", labelKey: "page.tabBluetooth", element: Bluetooth },
];

/**
 * Tabs this hardware supports: Network needs Wi-Fi or Ethernet, Bluetooth
 * needs Bluetooth. Until metadata arrives every tab shows, as on Android.
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

export const DeviceConfig = ({ onFormInit }: ConfigProps) => {
  const editor = useConfigEditor();
  const dirtyRadio = useSignal(
    editor?.dirtyRadioSections ?? EMPTY_DIRTY_RADIO_SIGNAL,
  );
  const staged = useSignal(editor?.stagedAdminMessages ?? EMPTY_STAGED_SIGNAL);
  const { metadata } = useDeviceCapabilities();
  const { t } = useTranslation("config");

  const tabs: SettingsTab[] = useMemo(() => {
    const dirty = dirtyDeviceTabs(dirtyRadio, staged.keys());
    return visibleDeviceTabs(metadata).map((tab) => ({
      key: tab.key,
      label: t(tab.labelKey),
      element: tab.element,
      isDirty: dirty.has(tab.key),
    }));
  }, [t, metadata, dirtyRadio, staged]);

  return <SettingsTabs tabs={tabs} onFormInit={onFormInit} />;
};
