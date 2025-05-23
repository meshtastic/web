import { useState } from "react";
import { ClockIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useTranslation } from "react-i18next";

export interface RebootOTADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_REBOOT_DELAY = 5; // seconds

export const RebootOTADialog = (
  { open, onOpenChange }: RebootOTADialogProps,
) => {
  const { t } = useTranslation();
  const { connection } = useDevice();
  const [time, setTime] = useState<number>(DEFAULT_REBOOT_DELAY);
  const [isScheduled, setIsScheduled] = useState(false);
  const [inputValue, setInputValue] = useState(DEFAULT_REBOOT_DELAY.toString());

  const handleSetTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.validity.valid) {
      e.preventDefault();
      return;
    }

    const val = e.target.value;
    setInputValue(val);

    const parsed = Number(val);
    if (!isNaN(parsed) && parsed > 0) {
      setTime(parsed);
    }
  };

  const handleRebootWithTimeout = async () => {
    if (!connection) return;
    setIsScheduled(true);

    const delay = time > 0 ? time : DEFAULT_REBOOT_DELAY;

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log("Rebooting...");
        resolve();
      }, delay * 1000);
    }).finally(() => {
      setIsScheduled(false);
      onOpenChange(false);
      setInputValue(DEFAULT_REBOOT_DELAY.toString());
    });
    connection.rebootOta(0);
  };

  const handleInstantReboot = async () => {
    if (!connection) return;

    await connection.rebootOta(DEFAULT_REBOOT_DELAY);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {t("command_palette_contextual_command_reboot_to_ota_mode")}
          </DialogTitle>
          <DialogDescription>
            {t("dialog_rebootOta_description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 p-2 items-center relative">
          <Input
            type="number"
            min={1}
            max={86400}
            className="dark:text-slate-900 appearance-none"
            value={inputValue}
            onChange={handleSetTime}
            placeholder={t("dialog_rebootOta_placeholder_enterDelay")}
          />
          <Button
            onClick={() => handleRebootWithTimeout()}
            name="scheduleReboot"
            className="w-9/12"
          >
            <ClockIcon className="mr-2" size={18} />
            {isScheduled
              ? t("dialog_rebootOta_status_scheduled")
              : t("command_palette_contextual_command_schedule_reboot")}
          </Button>
        </div>

        <Button
          variant="destructive"
          name="rebootNow"
          onClick={() => handleInstantReboot()}
        >
          <RefreshCwIcon className="mr-2" size={16} />
          {t("dialog_button_rebootOtaNow")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
