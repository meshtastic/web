import { Button } from "../../components/UI/Button.tsx";
import type { CookieAttributes } from "js-cookie";
import { useCallback, useEffect, useRef } from "react";
import useCookie from "./useCookie.ts";
import { useToast } from "./useToast.ts";

interface UseBackupReminderOptions {
  reminderInDays?: number;
  message: string;
  onAccept?: () => void | Promise<void>;
  enabled: boolean;
  cookieOptions?: CookieAttributes;
}

interface ReminderState {
  suppressed: boolean;
  lastShown: string;
}

const TOAST_APPEAR_DELAY = 10_000; // 10 seconds;
const TOAST_DURATION = 30_000; // 30 seconds;:

// remind user in 1 year to backup keys again, if they accept the reminder;
const ON_ACCEPT_REMINDER_DAYS = 365;

function isReminderExpired(lastShown: string): boolean {
  const lastShownDate = new Date(lastShown);
  const now = new Date();
  const daysSinceLastShown = (now.getTime() - lastShownDate.getTime()) /
    (1000 * 60 * 60 * 24);
  return daysSinceLastShown >= 7;
}

export function useBackupReminder({
  reminderInDays = 7,
  enabled,
  message,
  onAccept = () => {},
  cookieOptions,
}: UseBackupReminderOptions) {
  const { toast } = useToast();
  const toastShownRef = useRef(false);
  const { value: reminderCookie, setCookie } = useCookie<ReminderState>(
    "key_backup_reminder",
  );

  const suppressReminder = useCallback(
    (days: number) => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      setCookie(
        {
          suppressed: true,
          lastShown: new Date().toISOString(),
        },
        { ...cookieOptions, expires: expiryDate },
      );
    },
    [setCookie, cookieOptions],
  );

  useEffect(() => {
    if (!enabled || toastShownRef.current) return;

    const shouldShowReminder = !reminderCookie?.suppressed ||
      isReminderExpired(reminderCookie.lastShown);
    if (!shouldShowReminder) return;

    toastShownRef.current = true;

    const { dismiss } = toast({
      title: "Backup Reminder",
      duration: TOAST_DURATION,
      delay: TOAST_APPEAR_DELAY,
      description: message,
      action: (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => {
              onAccept();
              dismiss();
              suppressReminder(ON_ACCEPT_REMINDER_DAYS);
            }}
          >
            Back up now
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              dismiss();
              suppressReminder(reminderInDays);
            }}
          >
            Remind me in {reminderInDays} days
          </Button>
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
    reminderCookie,
  ]);
}
