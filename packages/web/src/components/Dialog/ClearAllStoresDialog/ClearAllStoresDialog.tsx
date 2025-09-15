import { clearAllStores } from "@core/stores";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";

export interface ClearAllStoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClearAllStoresDialog = ({
  open,
  onOpenChange,
}: ClearAllStoresDialogProps) => {
  const { t } = useTranslation("dialog");

  const handleClearAllStores = () => {
    clearAllStores();

    // Reload the app to ensure all state is cleared
    window.location.href = "/";
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      variant="destructive"
      title={t("clearAllStores.title")}
      description={t("clearAllStores.description")}
      confirmText={t("clearAllStores.confirm")}
      onConfirm={handleClearAllStores}
    />
  );
};
