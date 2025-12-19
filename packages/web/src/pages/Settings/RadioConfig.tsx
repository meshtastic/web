import { Channels } from "@app/components/PageComponents/Channels/Channels.tsx";
import { Lora } from "@app/components/PageComponents/Settings/Lora.tsx";
import { Security } from "@components/PageComponents/Settings/Security/Security.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@shared/components/ui/tabs";
import { useDevice, type ValidConfigType } from "@core/stores";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

interface ConfigPageProps {
  searchQuery?: string;
}

type TabItem = {
  case: ValidConfigType | "channels";
  label: string;
  element: ComponentType<ConfigPageProps>;
  count?: number;
};

export const RadioConfig = ({ searchQuery = "" }: ConfigPageProps) => {
  const { hasConfigChange } = useDevice();
  const { t } = useTranslation("config");

  const tabs: TabItem[] = [
    {
      case: "lora",
      label: t("page.lora.title"),
      element: Lora,
    },
    {
      case: "channels",
      label: t("page.channels.title"),
      element: Channels as ComponentType<ConfigPageProps>,
    },
    {
      case: "security",
      label: t("page.security.title"),
      element: Security as ComponentType<ConfigPageProps>,
    },
  ];

  const filteredTabs = tabs.filter((tab) => {
    if (!searchQuery.trim()) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return tab.label.toLowerCase().includes(query);
  });

  const hasChanges = (
    configCase: ValidConfigType | "user" | "channels",
  ): boolean => {
    return hasConfigChange(configCase as ValidConfigType);
  };

  return (
    <div className="space-y-6">
      {filteredTabs.length === 0 ? (
        <Card className="max-w-7xl">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No settings found matching "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={filteredTabs[0]?.case}>
          <TabsList className="flex">
            {filteredTabs.map((tab) => (
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
          {filteredTabs.map((tab) => (
            <TabsContent key={tab.case} value={tab.case}>
              <Card className="max-w-7xl">
                <CardHeader>
                  <CardTitle>{tab.label}</CardTitle>
                  <CardDescription>
                    {tab.case === "lora" && t("page.lora.description")}
                    {tab.case === "channels" && t("page.channels.description")}
                    {tab.case === "security" && t("page.security.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <tab.element searchQuery={searchQuery} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};
