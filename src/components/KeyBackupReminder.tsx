import { useBackupReminder } from "@core/hooks/useKeyBackupReminder.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";

export const KeyBackupReminder = () => {
  const { setDialogOpen } = useDevice();

  useBackupReminder({
    message:
      "We recommend backing up your key data regularly. Would you like to back up now?",
    onAccept: () => setDialogOpen("pkiBackup", true),
    enabled: true,
  });
  // deno-lint-ignore jsx-no-useless-fragment
  return <></>;
};
