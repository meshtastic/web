import { deviceRepo } from "@data/repositories";
import type { Device } from "@data/schema";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "./DialogWrapper.tsx";

export interface RemoveDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
  onRemoved?: () => void;
}

export const RemoveDeviceDialog = ({
  open,
  onOpenChange,
  device,
  onRemoved,
}: RemoveDeviceDialogProps) => {
  const { t } = useTranslation("dialog");

  if (!device) {
    return null;
  }

  const handleConfirm = async () => {
    await deviceRepo.deleteDevice(device.nodeNum);
    onRemoved?.();
  };

  const displayName = device.longName ?? device.shortName ?? `Node ${device.nodeNum}`;

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      title={t("removeDevice.title")}
      description={t("removeDevice.description")}
      variant="destructive"
      confirmText={t("removeDevice.confirm")}
      onConfirm={handleConfirm}
      icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
    >
      <div className="space-y-4 py-4">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="font-medium text-foreground">{displayName}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("removeDevice.nodeNum", { nodeNum: device.nodeNum })}
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-destructive">
            {t("removeDevice.warningTitle")}
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>{t("removeDevice.warningMessages")}</li>
            <li>{t("removeDevice.warningNodes")}</li>
            <li>{t("removeDevice.warningChannels")}</li>
            <li>{t("removeDevice.warningPositions")}</li>
            <li>{t("removeDevice.warningSettings")}</li>
          </ul>
        </div>
      </div>
    </DialogWrapper>
  );
};
