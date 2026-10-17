import { Bluetooth } from "@components/PageComponents/Settings/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Settings/Device/index.tsx";
import { Display } from "@components/PageComponents/Settings/Display.tsx";
import { Network } from "@components/PageComponents/Settings/Network/index.tsx";
import { Position } from "@components/PageComponents/Settings/Position.tsx";
import { Power } from "@components/PageComponents/Settings/Power.tsx";
import { useDeviceCapabilities } from "@core/hooks/useDeviceCapabilities.ts";
import type { ValidConfigType } from "@core/stores";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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

type DeviceTab = SettingsTab & { key: ValidConfigType; shown: boolean };

/** Device configuration, in the order of Android's deviceConfigRoutes. */
export const DeviceConfig = ({ onFormInit }: ConfigProps) => {
  const editor = useConfigEditor();
  const dirtyRadio = useSignal(
    editor?.dirtyRadioSections ?? EMPTY_DIRTY_RADIO_SIGNAL,
  );
  const { metadata } = useDeviceCapabilities();
  const { t } = useTranslation("config");

  const tabs: SettingsTab[] = useMemo(() => {
    // Until metadata arrives, show every tab, as Android does.
    const hasNetwork = !metadata || metadata.hasWifi || metadata.hasEthernet;
    const hasBluetooth = !metadata || metadata.hasBluetooth;
    const all: DeviceTab[] = [
      {
        key: "device",
        label: t("page.tabDevice"),
        element: Device,
        shown: true,
      },
      {
        key: "position",
        label: t("page.tabPosition"),
        element: Position,
        shown: true,
      },
      { key: "power", label: t("page.tabPower"), element: Power, shown: true },
      {
        key: "network",
        label: t("page.tabNetwork"),
        element: Network,
        shown: hasNetwork,
      },
      {
        key: "display",
        label: t("page.tabDisplay"),
        element: Display,
        shown: true,
      },
      {
        key: "bluetooth",
        label: t("page.tabBluetooth"),
        element: Bluetooth,
        shown: hasBluetooth,
      },
    ];
    return all
      .filter((tab) => tab.shown)
      .map((tab) => ({
        key: tab.key,
        label: tab.label,
        element: tab.element,
        isDirty: dirtyRadio.includes(tab.key),
      }));
  }, [t, metadata, dirtyRadio]);

  return <SettingsTabs tabs={tabs} onFormInit={onFormInit} />;
};
