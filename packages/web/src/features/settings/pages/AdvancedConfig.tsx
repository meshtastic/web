import { usePreference } from "@data/hooks";
import { DEFAULT_PREFERENCES } from "@state/ui";
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
import { Label } from "@shared/components/ui/label";
import { Slider } from "@shared/components/ui/slider";
import { Database } from "lucide-react";
import { Activity } from "react";
import { useTranslation } from "react-i18next";

const PACKET_BATCH_SIZE_MIN = 10;
const PACKET_BATCH_SIZE_MAX = 100;
const PACKET_BATCH_SIZE_STEP = 5;

interface MaintenanceConfigProps {
  searchQuery?: string;
}

export const AdvancedConfig = ({
  searchQuery = "",
}: MaintenanceConfigProps) => {
  const { t } = useTranslation("config");
  const { t: tUi } = useTranslation("ui");
  const [packetBatchSize, setPacketBatchSize] = usePreference(
    "packetBatchSize",
    DEFAULT_PREFERENCES.packetBatchSize,
    { notify: true },
  );

  // Filter based on search query
  const query = searchQuery.toLowerCase().trim();
  const databaseVisible =
    !query ||
    "database maintenance cleanup nodes download delete backup".includes(
      query,
    ) ||
    t("settings.database.cleanNodes", "Clean Node Database")
      .toLowerCase()
      .includes(query);

  const administrationVisible =
    !query ||
    "administration reboot shutdown factory reset nodedb devices device database download delete backup".includes(
      query,
    ) ||
    t("settings.advanced.administration.title", "Administration")
      .toLowerCase()
      .includes(query);

  const debugLogVisible =
    !query ||
    "debug log packet packets trace".includes(query) ||
    t("settings.advanced.debugLog.title", "Debug Log")
      .toLowerCase()
      .includes(query);

  const performanceVisible =
    !query ||
    "performance packet batch database".includes(query) ||
    tUi("preferences.performance.title").toLowerCase().includes(query);

  const isVisible =
    databaseVisible ||
    administrationVisible ||
    debugLogVisible ||
    performanceVisible;

  if (!isVisible) {
    return (
      <Card>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Activity mode={administrationVisible ? "visible" : "hidden"}>
        <Card>
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
        <Card>
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
        <Card>
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
      <Activity mode={performanceVisible ? "visible" : "hidden"}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {tUi("preferences.performance.title")}
            </CardTitle>
            <CardDescription>
              {tUi("preferences.performance.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {tUi("preferences.performance.packetBatchSize.label")}
                </Label>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {tUi("preferences.performance.packetBatchSize.description")}
                </p>
              </div>
              <span className="text-xs md:text-sm text-muted-foreground tabular-nums">
                {packetBatchSize}
              </span>
            </div>
            <Slider
              value={[packetBatchSize]}
              onValueChange={(value) => {
                const size = value[0];
                if (size !== undefined) {
                  void setPacketBatchSize(size);
                }
              }}
              min={PACKET_BATCH_SIZE_MIN}
              max={PACKET_BATCH_SIZE_MAX}
              step={PACKET_BATCH_SIZE_STEP}
            />
          </CardContent>
        </Card>
      </Activity>
    </div>
  );
};
