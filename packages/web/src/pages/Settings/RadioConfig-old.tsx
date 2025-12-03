import { Channels } from "@app/components/PageComponents/Channels/Channels";
import { LoRa } from "@components/PageComponents/Settings/LoRa.tsx";
import { Security } from "@components/PageComponents/Settings/Security/Security.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { useDevice, type ValidConfigType } from "@core/stores";
import { type ComponentType, Suspense } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useConfigSearch } from "@components/Settings/useConfigSearch";

interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
  searchQuery?: string;
}

type TabItem = {
  case: ValidConfigType | "channels";
  label: string;
  element: ComponentType<ConfigProps>;
  count?: number;
};

export const RadioConfig = ({ onFormInit, searchQuery = "" }: ConfigProps) => {
  const { hasConfigChange } = useDevice();
  const { t } = useTranslation("config");

  const tabs: TabItem[] = [
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
  ] as const;

  const flags = new Map(
    tabs.map((tab) => [
      tab.case,
      tab.case === "channels"
        ? false
        : hasConfigChange(tab.case as ValidConfigType),
    ]),
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue={t("page.tabLora")}>
        <TabsList className="grid w-full grid-cols-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.label} value={tab.label} className="relative">
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
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
                <CardDescription>
                  {tab.case === "lora" && t("page.lora.description")}
                  {tab.case === "channels" && t("page.channels.description")}
                  {tab.case === "security" && t("page.security.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense
                  fallback={<div className="animate-pulse">Loading...</div>}
                >
                  <tab.element onFormInit={onFormInit} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
