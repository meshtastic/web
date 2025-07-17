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
import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface RebootDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RebootDialog = ({ open, onOpenChange }: RebootDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection } = useDevice();

  const [time, setTime] = useState<number>(5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("reboot.title")}</DialogTitle>
          <DialogDescription>{t("reboot.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 p-4">
          <Input
            type="number"
            className="dark:text-slate-900"
            value={time}
            onChange={(e) => setTime(Number.parseInt(e.target.value))}
          />
          <Button
            className="w-24"
            name="now"
            onClick={() => {
              connection?.reboot(2).then(() => onOpenChange(false));
            }}
          >
            <RefreshCwIcon className="mr-2" size={16} />
            {t("button.now")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
