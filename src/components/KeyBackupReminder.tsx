import { useBackupReminder } from "@core/hooks/useKeyBackupReminder.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";

export const KeyBackupReminder = () => {
  const { setDialogOpen } = useDevice();
  const { t } = useTranslation();

  useBackupReminder({
    message: t("dialog_pkiBackup_message"),
    onAccept: () => setDialogOpen("pkiBackup", true),
    enabled: true,
  });
  // deno-lint-ignore jsx-no-useless-fragment
  return <></>;
};
