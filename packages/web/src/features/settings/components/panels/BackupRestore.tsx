import {
  ConfigBackupService,
  type ParsedConfigBackupField,
} from "@core/services/configBackupService.ts";
import { ImportConfigDialog } from "@shared/components/Dialog/ImportConfigDialog/ImportConfigDialog.tsx";
import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { useMyNode } from "@shared/hooks";
import { useToast } from "@shared/hooks/useToast";
import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function BackupRestore() {
  const { t } = useTranslation("config");
  const { toast } = useToast();
  const { myNodeNum } = useMyNode();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const exportConfig = async (type: "full" | "channels-only" = "full") => {
    if (!myNodeNum) {
      toast({
        title: t(
          "settings.advanced.backupRestore.export.failedTitle",
          "Export Failed",
        ),
        description: "No device connected",
        variant: "destructive",
      });
      return;
    }

    try {
      const yamlContent =
        type === "full"
          ? await ConfigBackupService.createBackup(myNodeNum)
          : await ConfigBackupService.createChannelOnlyBackup(myNodeNum);
      const suffix = type === "channels-only" ? "_channels" : "";
      const filename = `meshtastic_${myNodeNum || "config"}${suffix}.yaml`;
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
    options?: { channelImportMode?: "merge" | "replace" },
  ) => {
    try {
      await ConfigBackupService.applyToDevice(
        {} as never,
        fields,
        onProgress,
        options,
      );

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportConfig("full")}>
              <Download className="h-4 w-4 mr-2" />
              {t("settings.advanced.backupRestore.export.button", "Export")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportConfig("channels-only")}
            >
              {t(
                "settings.advanced.backupRestore.export.channelsOnly",
                "Channels Only",
              )}
            </Button>
          </div>
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
      </div>

      <ImportConfigDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </div>
  );
}
