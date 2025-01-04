import { useEffect, useCallback } from 'react';
import { useToast } from './useToast';
import useCookie from './useCookie';
import type { CookieAttributes } from 'js-cookie';
import { Button } from '@app/components/UI/Button';

interface UseBackupReminderOptions {
  suppressDays?: number;
  message?: string;
  onAccept?: () => void | Promise<void>;
  cookieName?: string;
  cookieOptions?: CookieAttributes;
}

interface ReminderState {
  suppressed: boolean;
  lastShown: string;
}

export function useBackupReminder({
  suppressDays = 365,
  message = "It's time to back up your key data. Would you like to do this now?",
  onAccept = () => { },
  cookieName = "backup_reminder_state",
  cookieOptions = {},
}: UseBackupReminderOptions = {}) {
  const { toast } = useToast();

  const [reminderState, setReminderState, resetReminderState] = useCookie<ReminderState>(cookieName);

  const suppressReminder = useCallback(() => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + suppressDays);

    setReminderState(
      {
        suppressed: true,
        lastShown: new Date().toISOString(),
      },
      {
        ...cookieOptions,
        expires: expiryDate,
      }
    );

  }, [setReminderState, suppressDays, cookieOptions]);

  useEffect(() => {
    if (!reminderState) {
      const { dismiss: dimissToast } = toast({
        title: "Backup Reminder",
        description: message,
        action: (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={"default"}
              onClick={async () => {
                await onAccept();
                dimissToast()
                suppressReminder();
              }}
            >
              Back up now
            </Button>
            <Button
              type="button"
              variant={"outline"}
              onClick={() => {
                dimissToast();
                suppressReminder();
              }}
            >
              Remind me later
            </Button>
          </div>
        ),
      });
    }
  }, [reminderState]);

  return {
    resetReminder: resetReminderState
  };
}