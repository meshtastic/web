import { Button } from "@shared/components/ui/button";
import { Label } from "@shared/components/ui/label";
import { useDevice } from "@core/stores";
import { AlertTriangle, Database, Power, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Administration() {
  const { t } = useTranslation("config");
  const { setDialogOpen } = useDevice();

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
    </div>
  );
}
