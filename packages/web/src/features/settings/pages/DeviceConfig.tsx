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
import { type ComponentType, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bluetooth } from "../components/panels/Bluetooth.tsx";
import { Device } from "../components/panels/Device/index.tsx";
import { Display } from "../components/panels/Display.tsx";
import { Network } from "../components/panels/Network/index.tsx";
import { Position } from "../components/panels/Position.tsx";
import { Power } from "../components/panels/Power.tsx";
import { User } from "../components/panels/User.tsx";
import { useSettingsNavigation } from "../search/index.ts";

type ConfigSection = {
  case: ValidConfigType | "user";
  label: string;
  description: string;
  element: ComponentType;
};

export const DeviceConfig = () => {
  const { myNodeNum } = useMyNode();
  const { hasVariantChanges } = usePendingChanges(myNodeNum);
  const { t } = useTranslation("config");
  const { activeTab, setActiveTab } = useSettingsNavigation();

  const sections: ConfigSection[] = useMemo(
    () => [
      {
        case: "user",
        label: t("page.user.title"),
        description: t("page.user.description"),
        element: User as ComponentType,
      },
      {
        case: "device",
        label: t("page.device.title"),
        description: t("page.device.description"),
        element: Device as ComponentType,
      },
      {
        case: "position",
        label: t("page.position.title"),
        description: t("page.position.description"),
        element: Position as ComponentType,
      },
      {
        case: "power",
        label: t("page.power.title"),
        description: t("page.power.description"),
        element: Power as ComponentType,
      },
      {
        case: "network",
        label: t("page.network.title"),
        description: t("page.network.description"),
        element: Network as ComponentType,
      },
      {
        case: "display",
        label: t("page.display.title"),
        description: t("page.display.description"),
        element: Display as ComponentType,
      },
      {
        case: "bluetooth",
        label: t("page.bluetooth.title"),
        description: t("page.bluetooth.description"),
        element: Bluetooth as ComponentType,
      },
    ],
    [t],
  );

  const hasChanges = (configCase: ValidConfigType | "user"): boolean => {
    if (configCase === "user") {
      return hasVariantChanges("user", null);
    }
    return hasVariantChanges("config", configCase);
  };

  // Default to first section if active tab doesn't match any section
  const currentTab = sections.find((s) => s.case === activeTab)
    ? activeTab
    : (sections[0]?.case ?? "user");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Tabs value={currentTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          {sections.map((section) => (
            <TabsTrigger
              key={section.case}
              value={section.case}
              className="relative"
            >
              {section.label}
              {hasChanges(section.case) && (
                <span className="absolute top-1 right-1 flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((section) => (
          <TabsContent key={section.case} value={section.case}>
            <Card>
              <CardHeader>
                <CardTitle>{section.label}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <section.element />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
