import { Button } from "@components/UI/Button.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Separator } from "@components/UI/Separator.tsx";
import { useDevice } from "@core/stores";
import { ClockIcon, OctagonXIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface RebootDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_REBOOT_DELAY = 5; // seconds

export const RebootDialog = ({ open, onOpenChange }: RebootDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection } = useDevice();
  const [time, setTime] = useState<number>(DEFAULT_REBOOT_DELAY);
  const [isScheduled, setIsScheduled] = useState(false);
  const [isOTA, setIsOTA] = useState(false);
  const [inputValue, setInputValue] = useState(DEFAULT_REBOOT_DELAY.toString());
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | undefined>();

  const handleReboot = (delay: number) => {
    if (!connection) {
      return;
    }

    if (isOTA) {
      connection.rebootOta(delay);
    } else {
      connection.reboot(delay);
    }
  };

  const handleSetTime = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.validity.valid) {
      e.preventDefault();
      return;
    }

    const val = e.target.value;
    setInputValue(val);

    const parsed = Number(val);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setTime(parsed);
    }
  };

  const handleRebootWithTimeout = async () => {
    setIsScheduled(true);

    const delay = time > 0 ? time : DEFAULT_REBOOT_DELAY;

    handleReboot(delay);

    const id = setTimeout(() => {
      setIsScheduled(false);
      onOpenChange(false);
      setInputValue(DEFAULT_REBOOT_DELAY.toString());
    }, delay * 1000);
    setTimeoutId(id);
  };

  const handleCancel = () => {
    clearTimeout(timeoutId);
    setIsScheduled(false);
    handleReboot(-1);
  };

  const handleInstantReboot = async () => {
    handleReboot(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("reboot.title")}</DialogTitle>
          <DialogDescription>{t("reboot.description")}</DialogDescription>
        </DialogHeader>
        <Separator />
        {!isScheduled ? (
          <>
            <Checkbox
              checked={isOTA}
              onChange={(checked) => setIsOTA(checked)}
              className="px-2"
            >
              {t("reboot.ota")}
            </Checkbox>
            <div className="flex gap-2 px-2 items-center relative">
              <Input
                type="number"
                min={1}
                max={86400}
                value={inputValue}
                onChange={handleSetTime}
                placeholder={t("reboot.enterDelay")}
                suffix={t("unit.second.plural")}
              />
              <Button
                onClick={() => handleRebootWithTimeout()}
                data-testid="scheduleRebootBtn"
                className="w-9/12"
              >
                <ClockIcon className="mr-2" size={18} />
                {t("reboot.schedule")}
              </Button>
            </div>
            <div className="px-2">
              <Button
                variant="destructive"
                name="rebootNow"
                onClick={() => handleInstantReboot()}
                className=" w-full"
              >
                <RefreshCwIcon className="mr-2" size={16} />
                {t("reboot.now")}
              </Button>
            </div>
          </>
        ) : (
          <div className="px-2">
            <div className="pb-6 pt-2  text-center">
              <Label className=" text-gray-700 dark:text-gray-300 ">
                {t("reboot.scheduled")}
              </Label>
            </div>
            <Button
              variant="destructive"
              name="cancelReboot"
              onClick={() => handleCancel()}
              className=" w-full"
              data-testid="cancelRebootBtn"
            >
              <OctagonXIcon className="mr-2" size={16} />
              {t("reboot.cancel")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
