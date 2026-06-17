import { toast } from "@core/hooks/useToast.ts";
import { useDevice } from "@core/stores";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";

export interface FactoryResetConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FactoryResetConfigDialog = ({
  open,
  onOpenChange,
}: FactoryResetConfigDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection } = useDevice();

  const handleFactoryResetConfig = () => {
    connection?.factoryResetConfig().catch((error) => {
      toast({
        title: t("factoryResetConfig.failedTitle"),
      });
      console.error("Failed to factory reset config:", error);
    });
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      variant="destructive"
      title={t("factoryResetConfig.title")}
      description={t("factoryResetConfig.description")}
      confirmText={t("factoryResetConfig.confirm")}
      onConfirm={handleFactoryResetConfig}
    />
  );
};
