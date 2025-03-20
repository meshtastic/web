import { Button } from "@components/UI/Button.tsx";
import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@core/hooks/useToast.ts";
import useLocalStorage from "@core/hooks/useLocalStorage.ts";

interface UseBackupReminderOptions {
  reminderInDays?: number;
  message: string;
  onAccept?: () => void | Promise<void>;
  enabled: boolean;
}

interface ReminderState {
  suppressed: boolean;
  lastShown: string;
}

const TOAST_APPEAR_DELAY = 10_000; // 10 seconds
const TOAST_DURATION = 30_000; // 30 seconds
const ON_ACCEPT_REMINDER_DAYS = 365;
const STORAGE_KEY = "key_backup_reminder";

function isReminderExpired(lastShown: string): boolean {
  const lastShownDate = new Date(lastShown);
  const now = new Date();
  const daysSinceLastShown = (now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLastShown >= 7;
}

export function useBackupReminder({
  reminderInDays = 7,
  enabled,
  message,
  onAccept = () => { },
}: UseBackupReminderOptions) {
  const { toast } = useToast();
  const toastShownRef = useRef(false);
  const [reminderState, setReminderState] = useLocalStorage<ReminderState | null>(
    STORAGE_KEY,
    null
  );

  // Suppress reminder for 10 years if not specified
  const suppressReminder = useCallback((days: number = 3563) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    setReminderState({
      suppressed: true,
      lastShown: new Date().toISOString(),
    });
  }, [setReminderState]);

  useEffect(() => {
    if (!enabled || toastShownRef.current) return;

    const shouldShowReminder =
      !reminderState?.suppressed || isReminderExpired(reminderState.lastShown);

    if (!shouldShowReminder) return;

    toastShownRef.current = true;

    const { dismiss } = toast({
      title: "Backup Reminder",
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
                suppressReminder(reminderInDays);
              }}
            >
              Remind me in {reminderInDays} days
            </Button>
            <Button
              type="button"
              variant="outline"
              className="p-1"
              onClick={() => {
                dismiss();
                suppressReminder();
              }}
            >
              Never remind me
            </Button>
          </div>
          <div className="flex">
            <Button
              type="button"
              variant="default"
              className="w-full"
              onClick={() => {
                onAccept();
                dismiss();
                suppressReminder(ON_ACCEPT_REMINDER_DAYS);
              }}
            >
              Back up now
            </Button>
          </div>
        </div>
      ),
    });

    return () => {
      if (!toastShownRef.current) {
        dismiss();
      }
    };
  }, [
    enabled,
    message,
    onAccept,
    reminderInDays,
    suppressReminder,
    toast,
    reminderState,
  ]);
}
