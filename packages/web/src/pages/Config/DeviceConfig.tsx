import { Bluetooth } from "@components/PageComponents/Config/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Config/Device/index.tsx";
import { Display } from "@components/PageComponents/Config/Display.tsx";
import { LoRa } from "@components/PageComponents/Config/LoRa.tsx";
import { Network } from "@components/PageComponents/Config/Network/index.tsx";
import { Position } from "@components/PageComponents/Config/Position.tsx";
import { Power } from "@components/PageComponents/Config/Power.tsx";
import { Security } from "@components/PageComponents/Config/Security/Security.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { useDevice, type ValidConfigType } from "@core/stores";
import { type ComponentType, Suspense, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
}

type TabItem = {
  case: ValidConfigType;
  label: string;
  element: ComponentType<ConfigProps>;
  count?: number;
};

export const DeviceConfig = ({ onFormInit }: ConfigProps) => {
  const { getWorkingConfig } = useDevice();
  const { t } = useTranslation("deviceConfig");
  const tabs: TabItem[] = [
    {
      case: "device",
      label: t("page.tabDevice"),
      element: Device,
      count: 0,
    },
    {
      case: "position",
      label: t("page.tabPosition"),
      element: Position,
    },
    {
      case: "power",
      label: t("page.tabPower"),
      element: Power,
    },
    {
      case: "network",
      label: t("page.tabNetwork"),
      element: Network,
    },
    {
      case: "display",
      label: t("page.tabDisplay"),
      element: Display,
    },
    {
      case: "lora",
      label: t("page.tabLora"),
      element: LoRa,
    },
    {
      case: "bluetooth",
      label: t("page.tabBluetooth"),
      element: Bluetooth,
    },
    {
      case: "security",
      label: t("page.tabSecurity"),
      element: Security,
    },
  ] as const;

  const flags = useMemo(
    () => new Map(tabs.map((tab) => [tab.case, getWorkingConfig(tab.case)])),
    [tabs, getWorkingConfig],
  );

  return (
    <Tabs defaultValue={t("page.tabDevice")}>
      <TabsList className="dark:bg-slate-700">
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
            <Suspense fallback={<Spinner size="lg" className="my-5" />}>
              <tab.element onFormInit={onFormInit} />
            </Suspense>
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  );
};
