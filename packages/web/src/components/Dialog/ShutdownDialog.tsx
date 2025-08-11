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
import { useDevice } from "@core/stores";
import { ClockIcon, PowerIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface ShutdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShutdownDialog = ({ open, onOpenChange }: ShutdownDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection } = useDevice();

  const [time, setTime] = useState<number>(5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("shutdown.title")}</DialogTitle>
          <DialogDescription>{t("shutdown.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 p-4">
          <Input
            type="number"
            value={time}
            onChange={(e) => setTime(Number.parseInt(e.target.value))}
            suffix={t("unit.minute.plural")}
          />
          <Button
            className="w-24"
            onClick={() => {
              connection?.shutdown(time * 60).then(() => onOpenChange(false));
            }}
          >
            <ClockIcon size={16} />
          </Button>
          <Button
            className="w-24"
            name="now"
            onClick={() => {
              connection?.shutdown(2).then(() => () => onOpenChange(false));
            }}
          >
            <PowerIcon className="mr-2" size={16} />
            {t("button.now")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
