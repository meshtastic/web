import { useBackupReminder } from "@app/core/hooks/useKeyBackupReminder";
import { useDevice } from "@app/core/stores/deviceStore";

export const KeyBackupReminder = (): JSX.Element => {
  const { setDialogOpen } = useDevice();

  useBackupReminder({
    reminderInDays: 7,
    message:
      "We recommend backing up your key data regularly. Would you like to back up now?",
    onAccept: () => setDialogOpen("pkiBackup", true),
    enabled: true,
    cookieOptions: {
      secure: true,
      sameSite: "strict",
    },
  });
  return <></>;
};
