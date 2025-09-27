import { toast } from "@core/hooks/useToast.ts";
import {
  useDevice,
  useDeviceStore,
  useMessageStore,
  useNodeDBStore,
} from "@core/stores";
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
  const { connection, id } = useDevice();

  const handleFactoryResetDevice = () => {
    connection?.factoryResetDevice().catch((error) => {
      toast({
        title: t("factoryResetDevice.failedTitle"),
      });
      console.error("Failed to factory reset device:", error);
    });

    // The device will be wiped and disconnected without resolving the promise
    // so we proceed to clear all data associated with the device immediately
    useDeviceStore.getState().removeDevice(id);
    useMessageStore.getState().removeMessageStore(id);
    useNodeDBStore.getState().removeNodeDB(id);

    // Reload the app to ensure all ephemeral state is cleared
    window.location.href = "/";
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
