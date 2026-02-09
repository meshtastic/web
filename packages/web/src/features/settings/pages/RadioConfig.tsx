import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import type { ValidConfigType } from "@features/settings/components/types.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@shared/components/ui/tabs";
import { useMyNode } from "@shared/hooks";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Channels } from "../components/panels/Channels";
import { Lora } from "../components/panels/Lora.tsx";
import { Security } from "../components/panels/Security/Security.tsx";
import { useSettingsNavigation } from "../search/index.ts";

type TabItem = {
  case: ValidConfigType | "channels";
  label: string;
  description: string;
  element: ComponentType;
};

export const RadioConfig = () => {
  const { myNodeNum } = useMyNode();
  const { hasVariantChanges } = usePendingChanges(myNodeNum);
  const { t } = useTranslation("config");
  const { activeTab, setActiveTab } = useSettingsNavigation();

  const tabs: TabItem[] = [
    {
      case: "lora",
      label: t("page.lora.title"),
      description: t("page.lora.description"),
      element: Lora,
    },
    {
      case: "channels",
      label: t("page.channels.title"),
      description: t("page.channels.description"),
      element: Channels as ComponentType,
    },
    {
      case: "security",
      label: t("page.security.title"),
      description: t("page.security.description"),
      element: Security as ComponentType,
    },
  ];

  const hasChanges = (
    configCase: ValidConfigType | "user" | "channels",
  ): boolean => {
    if (configCase === "channels") {
      return hasVariantChanges("channel", null);
    }
    return hasVariantChanges("config", configCase);
  };

  // Default to first tab if active tab doesn't match any tab
  const currentTab = tabs.find((tab) => tab.case === activeTab)
    ? activeTab
    : (tabs[0]?.case ?? "lora");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Tabs value={currentTab} onValueChange={setActiveTab}>
        <TabsList className="flex">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.case}
              value={tab.case}
              className="relative text-foreground"
            >
              {tab.label}
              {hasChanges(tab.case) && (
                <span className="absolute top-1 right-1 flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.case} value={tab.case}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <tab.element />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
