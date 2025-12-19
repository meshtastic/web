import { Administration } from "../components/panels/Administration";
import { DatabaseMaintenance } from "../components/panels/DatabaseMaintenance";
import { DebugLog } from "../components/panels/DebugLog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Activity } from "react";
import { useTranslation } from "react-i18next";

interface MaintenanceConfigProps {
  searchQuery?: string;
}

export const AdvancedConfig = ({
  searchQuery = "",
}: MaintenanceConfigProps) => {
  const { t } = useTranslation("config");

  // Filter based on search query
  const query = searchQuery.toLowerCase().trim();
  const databaseVisible =
    !query ||
    "database maintenance cleanup nodes".includes(query) ||
    t("settings.database.cleanNodes", "Clean Node Database")
      .toLowerCase()
      .includes(query);

  const administrationVisible =
    !query ||
    "administration reboot shutdown factory reset nodedb".includes(query) ||
    t("settings.advanced.administration.title", "Administration")
      .toLowerCase()
      .includes(query);

  const debugLogVisible =
    !query ||
    "debug log packet packets trace".includes(query) ||
    t("settings.advanced.debugLog.title", "Debug Log")
      .toLowerCase()
      .includes(query);

  const isVisible = databaseVisible || administrationVisible || debugLogVisible;

  if (!isVisible) {
    return (
      <Card className="max-w-7xl">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No settings found matching "{searchQuery}"
            {t("settings.advanced.noResultsSuffix", { search: searchQuery })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Activity mode={administrationVisible ? "visible" : "hidden"}>
        <Card className="max-w-7xl">
          <CardHeader>
            <CardTitle>
              {t("settings.advanced.administration.title", "Administration")}
            </CardTitle>
            <CardDescription>
              {t(
                "settings.advanced.administration.description",
                "Device management actions including reboot, shutdown, and reset options",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Administration />
          </CardContent>
        </Card>
      </Activity>
      <Activity mode={databaseVisible ? "visible" : "hidden"}>
        <Card className="max-w-7xl">
          <CardHeader>
            <CardTitle>
              {t("settings.advanced.database.title", "Database")}
            </CardTitle>
            <CardDescription>
              {t(
                "settings.advanced.database.description",
                "Manage local database storage and cleanup settings",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatabaseMaintenance />
          </CardContent>
        </Card>
      </Activity>
      <Activity mode={debugLogVisible ? "visible" : "hidden"}>
        <Card className="max-w-7xl">
          <CardHeader>
            <CardTitle>
              {t("settings.advanced.debugLog.title", "Debug Log")}
            </CardTitle>
            <CardDescription>
              {t(
                "settings.advanced.debugLog.description",
                "View raw packet log for debugging and troubleshooting",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DebugLog />
          </CardContent>
        </Card>
      </Activity>
    </div>
  );
};
