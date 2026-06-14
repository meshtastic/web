import { useBackupReminder } from "@core/hooks/useKeyBackupReminder.tsx";
import { useDevice } from "@core/stores";
import { useTranslation } from "react-i18next";

export const KeyBackupReminder = () => {
  const { setDialogOpen } = useDevice();
  const { t } = useTranslation("dialog");

  useBackupReminder({
    message: t("pkiBackupReminder.description"),
    onAccept: () => setDialogOpen("pkiBackup", true),
    enabled: true,
  });
  return null;
};
