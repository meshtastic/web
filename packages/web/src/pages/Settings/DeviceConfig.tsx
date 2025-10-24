import { Bluetooth } from "@components/PageComponents/Settings/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Settings/Device/index.tsx";
import { Display } from "@components/PageComponents/Settings/Display.tsx";
import { Network } from "@components/PageComponents/Settings/Network/index.tsx";
import { Position } from "@components/PageComponents/Settings/Position.tsx";
import { Power } from "@components/PageComponents/Settings/Power.tsx";
import { User } from "@components/PageComponents/Settings/User.tsx";
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
  case: ValidConfigType | "user";
  label: string;
  element: ComponentType<ConfigProps>;
  count?: number;
};

export const DeviceConfig = ({ onFormInit }: ConfigProps) => {
  const { hasConfigChange, hasUserChange } = useDevice();
  const { t } = useTranslation("config");
  const tabs: TabItem[] = [
    {
      case: "user",
      label: t("page.tabUser"),
      element: User,
    },
    {
      case: "device",
      label: t("page.tabDevice"),
      element: Device,
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
      case: "bluetooth",
      label: t("page.tabBluetooth"),
      element: Bluetooth,
    },
  ] as const;

  const flags = useMemo(
    () =>
      new Map(
        tabs.map((tab) => [
          tab.case,
          tab.case === "user"
            ? hasUserChange()
            : hasConfigChange(tab.case as ValidConfigType),
        ]),
      ),
    [tabs, hasConfigChange, hasUserChange],
  );

  return (
    <Tabs defaultValue={t("page.tabUser")}>
      <TabsList className="w-full dark:bg-slate-700">
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
