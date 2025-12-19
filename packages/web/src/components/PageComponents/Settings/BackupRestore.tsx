import { ImportConfigDialog } from "@components/Dialog/ImportConfigDialog/ImportConfigDialog.tsx";
import { Button } from "@components/ui/button";
import { Label } from "@components/ui/label";
import { useToast } from "@core/hooks/useToast.ts";
import {
  type ParsedConfigBackupField,
  ConfigBackupService,
} from "@core/services/configBackupService.ts";
import { useDevice } from "@core/stores";
import { Download, Key, Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function BackupRestore() {
  const { t } = useTranslation("config");
  const { toast } = useToast();
  const device = useDevice();
  const { setDialogOpen } = device;
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const exportConfig = async () => {
    try {
      const yamlContent = await ConfigBackupService.createBackup(device);
      const filename = `meshtastic_${device.hardware?.myNodeNum || "config"}.yaml`;
      ConfigBackupService.downloadBackup(yamlContent, filename);

      toast({
        title: t(
          "settings.advanced.backupRestore.export.successTitle",
          "Export Successful",
        ),
        description: t(
          "settings.advanced.backupRestore.export.successDescription",
          "Configuration exported successfully.",
        ),
      });
    } catch (error) {
      toast({
        title: t(
          "settings.advanced.backupRestore.export.failedTitle",
          "Export Failed",
        ),
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleImport = async (
    fields: ParsedConfigBackupField[],
    onProgress: (percent: number, status: string) => void,
  ) => {
    try {
      await ConfigBackupService.applyToDevice({} as never, fields, device, onProgress);

      toast({
        title: t(
          "settings.advanced.backupRestore.import.successTitle",
          "Import Successful",
        ),
        description: t(
          "settings.advanced.backupRestore.import.successDescription",
          "Configuration imported successfully.",
        ),
      });
    } catch (error) {
      toast({
        title: t(
          "settings.advanced.backupRestore.import.failedTitle",
          "Import Failed",
        ),
        description: (error as Error).message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              {t(
                "settings.advanced.backupRestore.export.title",
                "Export Configuration",
              )}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "settings.advanced.backupRestore.export.description",
                "Download device configuration as a YAML file",
              )}
            </p>
          </div>
          <Button variant="outline" onClick={exportConfig}>
            <Download className="h-4 w-4 mr-2" />
            {t("settings.advanced.backupRestore.export.button", "Export")}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              {t(
                "settings.advanced.backupRestore.import.title",
                "Import Configuration",
              )}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "settings.advanced.backupRestore.import.description",
                "Restore device configuration from a YAML file",
              )}
            </p>
          </div>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t("settings.advanced.backupRestore.import.button", "Import")}
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">
              {t(
                "settings.advanced.backupRestore.backupKeys.title",
                "Backup Keys",
              )}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t(
                "settings.advanced.backupRestore.backupKeys.description",
                "Download your encryption keys for safekeeping",
              )}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setDialogOpen("pkiBackup", true)}
          >
            <Key className="h-4 w-4 mr-2" />
            {t("settings.advanced.backupRestore.backupKeys.button", "Backup")}
          </Button>
        </div>
      </div>

      <ImportConfigDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </div>
  );
}