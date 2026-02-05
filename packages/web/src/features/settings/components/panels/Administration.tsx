import { dbClient } from "@data/client";
import { useDevices, useDeviceStorage } from "@data/hooks";
import type { Device } from "@data/schema";
import { RemoveDeviceDialog } from "@shared/components/Dialog/RemoveDeviceDialog";
import { DialogWrapper } from "@shared/components/Dialog/DialogWrapper";
import { TimeAgo } from "@shared/components/TimeAgo";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { Separator } from "@shared/components/ui/separator";
import { useUIStore } from "@state/index.ts";
import {
  AlertTriangle,
  Database,
  Download,
  HardDriveIcon,
  Power,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DeviceRow({
  device,
  storageBytes,
  onRemove,
}: {
  device: Device;
  storageBytes: number | undefined;
  onRemove: () => void;
}) {
  const { t } = useTranslation("ui");
  const displayName =
    device.longName ?? device.shortName ?? `Node ${device.nodeNum}`;

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{displayName}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>#{device.nodeNum}</span>
          <span>-</span>
          <span>{t("preferences.devices.lastSeen")}</span>
          <TimeAgo
            timestamp={device.lastSeen.getTime()}
            className="text-sm text-muted-foreground"
          />
        </div>
        {storageBytes !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <HardDriveIcon className="h-3 w-3" />
            <span>{formatBytes(storageBytes)}</span>
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
        aria-label={t("preferences.devices.remove")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function Administration() {
  const { t } = useTranslation("config");
  const { t: tUi } = useTranslation("ui");
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);
  const { devices, isLoading } = useDevices();
  const storage = useDeviceStorage();
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);
  const [showDeleteDbDialog, setShowDeleteDbDialog] = useState(false);

  const handleDownloadDatabase = useCallback(async () => {
    const file = await dbClient.getDatabaseFile();
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meshtastic.db";
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleDeleteDatabase = useCallback(async () => {
    await dbClient.deleteDatabaseFile();
    window.location.reload();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-1">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              {t("settings.advanced.administration.reboot.title", "Reboot")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "settings.advanced.administration.reboot.description",
                "Restart the connected device",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setDialogOpen("reboot", true)}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("settings.advanced.administration.reboot.button", "Reboot")}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              {t("settings.advanced.administration.shutdown.title", "Shutdown")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "settings.advanced.administration.shutdown.description",
                "Turn off the connected device",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setDialogOpen("shutdown", true)}
          >
            <Power className="h-4 w-4 mr-2" />
            {t("settings.advanced.administration.shutdown.button", "Shutdown")}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              {t(
                "settings.advanced.administration.resetNodeDb.title",
                "Reset Node Database",
              )}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "settings.advanced.administration.resetNodeDb.description",
                "Clear all nodes from the device's node database",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setDialogOpen("resetNodeDb", true)}
          >
            <Database className="h-4 w-4 mr-2" />
            {t("settings.advanced.administration.resetNodeDb.button", "Reset")}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              {t("settings.advanced.administration.factoryReset.title")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.advanced.administration.factoryReset.description")}
            </p>
          </div>
          <Button
            variant="destructive"
            className="inline-flex"
            onClick={() => setDialogOpen("factoryResetDevice", true)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t("settings.advanced.administration.factoryReset.button")}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label className="text-base font-medium">
            {tUi("preferences.devices.database", "Database")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {tUi(
              "preferences.devices.databaseDescription",
              "Download a backup or delete all stored data",
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void handleDownloadDatabase()}
          >
            <Download className="h-4 w-4 mr-2" />
            {tUi("preferences.devices.downloadDatabase", "Download")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDbDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {tUi("preferences.devices.deleteDatabase", "Delete")}
          </Button>
          <DialogWrapper
            open={showDeleteDbDialog}
            onOpenChange={setShowDeleteDbDialog}
            type="confirm"
            variant="destructive"
            title={tUi(
              "preferences.devices.deleteDatabaseTitle",
              "Delete Database?",
            )}
            description={tUi(
              "preferences.devices.deleteDatabaseWarning",
              "This will permanently delete all stored data including node data, message history, telemetry data, and settings. This action cannot be undone.",
            )}
            confirmText={tUi("preferences.devices.deleteDatabase", "Delete")}
            onConfirm={handleDeleteDatabase}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-base font-medium">
            {tUi("preferences.devices.title")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {tUi("preferences.devices.description")}
          </p>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading devices...</p>
        ) : devices.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {tUi("preferences.devices.noDevices")}
          </p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <DeviceRow
                key={device.nodeNum}
                device={device}
                storageBytes={storage.get(device.nodeNum)}
                onRemove={() => setDeviceToRemove(device)}
              />
            ))}
          </div>
        )}
      </div>

      <RemoveDeviceDialog
        open={deviceToRemove !== null}
        onOpenChange={(open) => !open && setDeviceToRemove(null)}
        device={deviceToRemove}
        onRemoved={() => setDeviceToRemove(null)}
      />
    </div>
  );
}
