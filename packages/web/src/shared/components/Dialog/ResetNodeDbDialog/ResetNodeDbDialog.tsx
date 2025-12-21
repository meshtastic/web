import { MigrationService } from "@data/index";
import { useDeleteMessages } from "@shared/hooks/useDeleteMessages.ts";
import { toast } from "@shared/hooks/useToast.ts";
import { useDevice } from "@state/index.ts";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";

export interface ResetNodeDbDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResetNodeDbDialog = ({
  open,
  onOpenChange,
}: ResetNodeDbDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection, id: deviceId } = useDevice();
  const { deleteAllMessages } = useDeleteMessages();

  const handleResetNodeDb = () => {
    connection
      ?.resetNodes()
      .then(async () => {
        // Delete all messages and nodes from the database for this device
        await deleteAllMessages();
        await MigrationService.deleteDeviceData(deviceId);
      })
      .catch((error) => {
        toast({
          title: t("resetNodeDb.failedTitle"),
        });
        console.error("Failed to reset Node DB:", error);
      });
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      variant="destructive"
      title={t("resetNodeDb.title")}
      description={t("resetNodeDb.description")}
      confirmText={t("resetNodeDb.confirm")}
      onConfirm={handleResetNodeDb}
    />
  );
};
