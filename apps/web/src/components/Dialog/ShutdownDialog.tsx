import { Button } from "@components/UI/Button.tsx";
import { Input } from "@components/UI/Input.tsx";
import { useDevice } from "@core/stores";
import { ClockIcon, PowerIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "./DialogWrapper.tsx";

export interface ShutdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShutdownDialog = ({ open, onOpenChange }: ShutdownDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection } = useDevice();
  const [time, setTime] = useState<number>(5);

  const handleScheduledShutdown = () => {
    connection?.shutdown(time * 60).then(() => onOpenChange(false));
  };

  const handleImmediateShutdown = () => {
    connection?.shutdown(2).then(() => onOpenChange(false));
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="custom"
      title={t("shutdown.title")}
      description={t("shutdown.description")}
      showFooter={false}
    >
      <div className="flex gap-2 p-4">
        <Input
          type="number"
          value={time}
          onChange={(e) => setTime(Number.parseInt(e.target.value, 10))}
          suffix={t("unit.minute.plural")}
        />
        <Button className="w-24" onClick={handleScheduledShutdown}>
          <ClockIcon size={16} />
        </Button>
        <Button className="w-24" name="now" onClick={handleImmediateShutdown}>
          <PowerIcon className="mr-2" size={16} />
          {t("button.now")}
        </Button>
      </div>
    </DialogWrapper>
  );
};
