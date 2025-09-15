import { toast } from "@core/hooks/useToast.ts";
import { useDevice, useMessages, useNodeDB } from "@core/stores";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";

export interface FactoryResetDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FactoryResetDeviceDialog = ({
  open,
  onOpenChange,
}: FactoryResetDeviceDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection } = useDevice();
  const { removeAllNodeErrors, removeAllNodes } = useNodeDB();
  const { deleteAllMessages } = useMessages();

  const handleFactoryResetDevice = () => {
    connection
      ?.factoryResetDevice()
      .catch((error) => {
        toast({
          title: t("factoryResetDevice.failedTitle"),
        });
        console.error("Failed to factory reset device:", error);
      })
      .finally(() => {
        deleteAllMessages();
        removeAllNodeErrors();
        removeAllNodes();
      });
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      variant="destructive"
      title={t("factoryResetDevice.title")}
      description={t("factoryResetDevice.description")}
      confirmText={t("factoryResetDevice.confirm")}
      onConfirm={handleFactoryResetDevice}
    />
  );
};
