import { Bluetooth } from "@components/PageComponents/Settings/Bluetooth.tsx";
import { Device } from "@components/PageComponents/Settings/Device/index.tsx";
import { Display } from "@components/PageComponents/Settings/Display.tsx";
import { Network } from "@components/PageComponents/Settings/Network/index.tsx";
import { Position } from "@components/PageComponents/Settings/Position.tsx";
import { Power } from "@components/PageComponents/Settings/Power.tsx";
import { User } from "@components/PageComponents/Settings/User.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { useDevice, type ValidConfigType } from "@core/stores";
import { type ComponentType, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
  searchQuery?: string;
}

type ConfigSection = {
  case: ValidConfigType | "user";
  label: string;
  description: string;
  element: ComponentType<ConfigProps>;
};

export const DeviceConfig = ({ onFormInit, searchQuery = "" }: ConfigProps) => {
  const { hasConfigChange, hasUserChange } = useDevice();
  const { t } = useTranslation("config");

  const sections: ConfigSection[] = useMemo(
    () => [
      {
        case: "user",
        label: t("page.user.title"),
        description: t("page.user.description"),
        element: User,
      },
      {
        case: "device",
        label: t("page.device.title"),
        description: t("page.device.description"),
        element: Device,
      },
      {
        case: "position",
        label: t("page.position.title"),
        description: t("page.position.description"),
        element: Position,
      },
      {
        case: "power",
        label: t("page.power.title"),
        description: t("page.power.description"),
        element: Power,
      },
      {
        case: "network",
        label: t("page.network.title"),
        description: t("page.network.description"),
        element: Network,
      },
      {
        case: "display",
        label: t("page.display.title"),
        description: t("page.display.description"),
        element: Display,
      },
      {
        case: "bluetooth",
        label: t("page.bluetooth.title"),
        description: t("page.bluetooth.description"),
        element: Bluetooth,
      },
    ],
    [t],
  );

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return sections;
    }

    const query = searchQuery.toLowerCase();
    return sections.filter(
      (section) =>
        section.label.toLowerCase().includes(query) ||
        section.description.toLowerCase().includes(query),
    );
  }, [sections, searchQuery]);

  const hasChanges = (configCase: ValidConfigType | "user"): boolean => {
    return configCase === "user"
      ? hasUserChange()
      : hasConfigChange(configCase as ValidConfigType);
  };

  return (
    <div className="space-y-6">
      {filteredSections.length === 0 ? (
        <Card className="max-w-7xl">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No settings found matching "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={filteredSections[0]?.case}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {filteredSections.map((section) => (
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
          {filteredSections.map((section) => (
            <TabsContent key={section.case} value={section.case}>
              <Card className="max-w-7xl">
                <CardHeader>
                  <CardTitle>{section.label}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <section.element
                    onFormInit={onFormInit}
                    searchQuery={searchQuery}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};
