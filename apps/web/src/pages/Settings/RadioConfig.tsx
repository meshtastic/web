import { Channels } from "@app/components/PageComponents/Channels/Channels";
import { LoRa } from "@components/PageComponents/Settings/LoRa.tsx";
import { Security } from "@components/PageComponents/Settings/Security/Security.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/UI/Tabs.tsx";
import type { ValidConfigType } from "@core/stores";
import { useConfigEditor, useSignal } from "@meshtastic/sdk-react";
import { type ComponentType, Suspense, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
}

type TabItem = {
  case: ValidConfigType | "channels";
  label: string;
  element: ComponentType<ConfigProps>;
  count?: number;
};

const EMPTY_DIRTY_RADIO_SIGNAL = {
  value: [] as readonly string[],
  peek: () => [] as readonly string[],
  subscribe: () => () => {},
} as const;

const EMPTY_DIRTY_CHANNELS_SIGNAL = {
  value: [] as readonly number[],
  peek: () => [] as readonly number[],
  subscribe: () => () => {},
} as const;

export const RadioConfig = ({ onFormInit }: ConfigProps) => {
  const editor = useConfigEditor();
  const dirtyRadio = useSignal(editor?.dirtyRadioSections ?? EMPTY_DIRTY_RADIO_SIGNAL);
  const dirtyChannels = useSignal(editor?.dirtyChannels ?? EMPTY_DIRTY_CHANNELS_SIGNAL);
  const { t } = useTranslation("config");
  const tabs: TabItem[] = useMemo(
    () => [
      {
        case: "lora",
        label: t("page.tabLora"),
        element: LoRa,
      },
      {
        case: "channels",
        label: t("page.tabChannels"),
        element: Channels,
      },
      {
        case: "security",
        label: t("page.tabSecurity"),
        element: Security,
      },
    ],
    [t],
  );

  const flags = useMemo(
    () =>
      new Map(
        tabs.map((tab) => [
          tab.case,
          tab.case === "channels" ? dirtyChannels.length > 0 : dirtyRadio.includes(tab.case),
        ]),
      ),
    [tabs, dirtyRadio, dirtyChannels],
  );

  return (
    <Tabs defaultValue={t("page.tabLora")}>
      <TabsList className="w-full dark:bg-slate-700">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.label} value={tab.label} className="dark:text-white relative">
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
