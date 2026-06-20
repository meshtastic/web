import { Button } from "@components/UI/Button.tsx";
import useLocalStorage from "@core/hooks/useLocalStorage.ts";
import { useToast } from "@core/hooks/useToast.ts";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface UseBackupReminderOptions {
  reminderInDays?: number;
  message: string;
  onAccept?: () => void | Promise<void>;
  enabled: boolean;
}

interface ReminderState {
  expires: string;
}

const TOAST_APPEAR_DELAY = 10_000; // 10 seconds
const TOAST_DURATION = 30_000; // 30 seconds
const REMINDER_DAYS_ONE_WEEK = 7;
const REMINDER_DAYS_ONE_YEAR = 365;
const REMINDER_DAYS_FOREVER = 3650;
const STORAGE_KEY = "key_backup_reminder";

function isReminderExpired(expires?: string): boolean {
  if (!expires) {
    return true;
  }
  const expiryDate = new Date(expires);
  if (Number.isNaN(expiryDate.getTime())) {
    return true; // Invalid date passed
  }

  const now = new Date();
  return now.getTime() >= expiryDate.getTime();
}

export function useBackupReminder({
  enabled,
  message,
  onAccept = () => {},
  reminderInDays = REMINDER_DAYS_ONE_WEEK,
}: UseBackupReminderOptions) {
  const { t } = useTranslation("dialog");

  const { toast } = useToast();
  const toastShownRef = useRef(false);
  const [reminderState, setReminderState] =
    useLocalStorage<ReminderState | null>(STORAGE_KEY, null);

  const setReminderExpiry = useCallback(
    (days: number) => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      setReminderState({ expires: expiryDate.toISOString() });
    },
    [setReminderState],
  );

  useEffect(() => {
    if (!enabled || toastShownRef.current) {
      return;
    }

    if (!isReminderExpired(reminderState?.expires)) {
      return;
    }

    toastShownRef.current = true;

    const { dismiss } = toast({
      title: t("pkiBackupReminder.title"),
      duration: TOAST_DURATION,
      delay: TOAST_APPEAR_DELAY,
      description: message,
      action: (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="p-1"
              onClick={() => {
                dismiss();
                setReminderExpiry(reminderInDays);
              }}
            >
              {t("pkiBackupReminder.remindLaterPrefix")} {reminderInDays}{" "}
              {reminderInDays > 1
                ? t("common:unit.day.plural").toLowerCase()
                : t("common:unit.day.one").toLowerCase()}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="p-1"
              onClick={() => {
                dismiss();
                setReminderExpiry(REMINDER_DAYS_FOREVER);
              }}
            >
              {t("pkiBackupReminder.remindNever")}
            </Button>
          </div>
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={() => {
              onAccept();
              dismiss();
              setReminderExpiry(REMINDER_DAYS_ONE_YEAR);
            }}
          >
            {t("pkiBackupReminder.backupNow")}
          </Button>
        </div>
      ),
    });

    return () => dismiss();
  }, [
    enabled,
    message,
    onAccept,
    reminderInDays,
    reminderState?.expires,
    setReminderExpiry,
    t,
    toast,
  ]);
}
