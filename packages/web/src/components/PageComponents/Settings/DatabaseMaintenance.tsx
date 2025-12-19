import logger from "../../../core/services/logger.ts";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { Slider } from "@shared/components/ui/slider";
import { Switch } from "@shared/components/ui/switch";
import {
  getNodeCleanupSettings,
  type NodeCleanupSettings,
  runNodeCleanup,
  updateNodeCleanupSettings,
} from "@core/services/maintenanceService";
import { useDeviceContext } from "@core/stores";
import { nodeRepo } from "@data/index";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function DatabaseMaintenance() {
  const { t } = useTranslation();
  const { deviceId } = useDeviceContext();

  const [settings, setSettings] = useState<NodeCleanupSettings>({
    enabled: true,
    daysOld: 30,
    unknownOnly: false,
    lastRun: null,
  });
  const [nodeCount, setNodeCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from database
  useEffect(() => {
    if (!deviceId) {
      return;
    }
    getNodeCleanupSettings(deviceId).then(setSettings);
  }, [deviceId]);

  const refreshCount = useCallback(async () => {
    if (!deviceId) {
      return;
    }
    setIsLoading(true);
    try {
      const count = await nodeRepo.countStaleNodes(
        deviceId,
        settings.daysOld,
        settings.unknownOnly,
      );
      setNodeCount(count);
    } catch (error) {
      logger.error("Failed to count stale nodes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, settings.daysOld, settings.unknownOnly]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const handleSettingChange = async (updates: Partial<NodeCleanupSettings>) => {
    if (!deviceId) {
      return;
    }
    const updated = await updateNodeCleanupSettings(deviceId, updates);
    setSettings(updated);
  };

  const handleCleanup = async () => {
    if (!deviceId || nodeCount === 0) {
      return;
    }

    setIsDeleting(true);
    try {
      const deleted = await runNodeCleanup(
        deviceId,
        settings.daysOld,
        settings.unknownOnly,
      );
      logger.debug(`Deleted ${deleted} stale nodes`);
      // Reload settings to get updated lastRun
      const updated = await getNodeCleanupSettings(deviceId);
      setSettings(updated);
      await refreshCount();
    } catch (error) {
      logger.error("Failed to delete stale nodes:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDaysChange = (value: number[]) => {
    const newDays = value[0];
    if (newDays !== undefined) {
      handleSettingChange({ daysOld: newDays });
    }
  };

  const formatLastRun = (timestamp: number | null): string => {
    if (!timestamp) {
      return t("settings.database.cleanNodes.neverRun", "Never");
    }
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">
            {t("settings.database.cleanNodes.title", "Clean Node Database")}
          </Label>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => handleSettingChange({ enabled })}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            "settings.database.cleanNodes.description",
            "Automatically remove nodes from the local database that haven't been heard from recently. Runs weekly.",
          )}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="days-slider">
              {t(
                "settings.database.cleanNodes.daysLabel",
                "Clean up nodes last seen older than {{days}} days",
                { days: settings.daysOld },
              )}
            </Label>
          </div>
          <Slider
            id="days-slider"
            value={[settings.daysOld]}
            min={1}
            max={365}
            step={1}
            onValueCommit={handleDaysChange}
            className="w-full"
            rangeClassName="bg-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 day</span>
            <span>365 days</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="unknown-only" className="flex-1">
            {t(
              "settings.database.cleanNodes.unknownOnly",
              "Clean up only unknown nodes",
            )}
          </Label>
          <Switch
            id="unknown-only"
            checked={settings.unknownOnly}
            onCheckedChange={(unknownOnly) =>
              handleSettingChange({ unknownOnly })
            }
          />
        </div>

        <div className="rounded-md bg-muted p-3 space-y-1">
          <p className="text-sm">
            {isLoading
              ? t("settings.database.cleanNodes.counting", "Counting nodes...")
              : t(
                  "settings.database.cleanNodes.queuedCount",
                  "{{count}} nodes queued for deletion",
                  { count: nodeCount },
                )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("settings.database.cleanNodes.lastRun", "Last run: {{- time}}", {
              time: formatLastRun(settings.lastRun),
            })}
          </p>
        </div>

        <Button
          variant="destructive"
          onClick={handleCleanup}
          disabled={isDeleting || nodeCount === 0 || isLoading}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting
            ? t("settings.database.cleanNodes.cleaning", "Cleaning...")
            : t("settings.database.cleanNodes.cleanNow", "Clean Now")}
        </Button>
      </div>
    </div>
  );
}
