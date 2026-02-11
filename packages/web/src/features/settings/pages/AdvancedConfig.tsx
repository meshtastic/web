import { usePreference } from "@data/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Label } from "@shared/components/ui/label";
import { Slider } from "@shared/components/ui/slider";
import { DEFAULT_PREFERENCES } from "@state/ui";
import { Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Administration } from "../components/panels/Administration";
import { DatabaseMaintenance } from "../components/panels/DatabaseMaintenance";
import { DebugLog } from "../components/panels/DebugLog";
import { SerialMonitor } from "../components/panels/SerialMonitor";

const PACKET_BATCH_SIZE_MIN = 10;
const PACKET_BATCH_SIZE_MAX = 100;
const PACKET_BATCH_SIZE_STEP = 5;

export const AdvancedConfig = () => {
  const { t } = useTranslation("config");
  const { t: tUi } = useTranslation("ui");
  const [packetBatchSize, setPacketBatchSize] = usePreference(
    "packetBatchSize",
    DEFAULT_PREFERENCES.packetBatchSize,
    { notify: true },
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card data-section="administration">
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

      <Card data-section="database">
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

      <Card data-section="debugLog">
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

      <Card data-section="serialMonitor">
        <CardHeader>
          <CardTitle>
            {t("settings.advanced.serialMonitor.title", "Serial Monitor")}
          </CardTitle>
          <CardDescription>
            {t(
              "settings.advanced.serialMonitor.description",
              "Connect to a device's serial port to view raw debug output",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SerialMonitor />
        </CardContent>
      </Card>

      <Card data-section="performance">
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
              <Label data-field-name="packetBatchSize">
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
    </div>
  );
};
