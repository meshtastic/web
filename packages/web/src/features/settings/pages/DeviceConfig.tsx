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
import { useDevice, type ValidConfigType } from "@state/index.ts";
import { type ComponentType, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bluetooth } from "../components/panels/Bluetooth.tsx";
import { Device } from "../components/panels/Device/index.tsx";
import { Display } from "../components/panels/Display.tsx";
import { Network } from "../components/panels/Network/index.tsx";
import { Position } from "../components/panels/Position.tsx";
import { Power } from "../components/panels/Power.tsx";
import { User } from "../components/panels/User.tsx";

interface ConfigPageProps {
  searchQuery?: string;
}

type ConfigSection = {
  case: ValidConfigType | "user";
  label: string;
  description: string;
  element: ComponentType<ConfigPageProps>;
};

export const DeviceConfig = ({ searchQuery = "" }: ConfigPageProps) => {
  const { hasConfigChange, hasUserChange } = useDevice();
  const { t } = useTranslation("config");

  const sections: ConfigSection[] = useMemo(
    () => [
      {
        case: "user",
        label: t("page.user.title"),
        description: t("page.user.description"),
        element: User as ComponentType<ConfigPageProps>,
      },
      {
        case: "device",
        label: t("page.device.title"),
        description: t("page.device.description"),
        element: Device as ComponentType<ConfigPageProps>,
      },
      {
        case: "position",
        label: t("page.position.title"),
        description: t("page.position.description"),
        element: Position as ComponentType<ConfigPageProps>,
      },
      {
        case: "power",
        label: t("page.power.title"),
        description: t("page.power.description"),
        element: Power as ComponentType<ConfigPageProps>,
      },
      {
        case: "network",
        label: t("page.network.title"),
        description: t("page.network.description"),
        element: Network as ComponentType<ConfigPageProps>,
      },
      {
        case: "display",
        label: t("page.display.title"),
        description: t("page.display.description"),
        element: Display as ComponentType<ConfigPageProps>,
      },
      {
        case: "bluetooth",
        label: t("page.bluetooth.title"),
        description: t("page.bluetooth.description"),
        element: Bluetooth as ComponentType<ConfigPageProps>,
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
          <TabsList className="flex flex-wrap">
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
                  <section.element searchQuery={searchQuery} />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};
