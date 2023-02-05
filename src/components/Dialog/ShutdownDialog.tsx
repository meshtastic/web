import { useState } from "react";
import { useDevice } from "@core/providers/useDevice.js";
import { Dialog } from "@components/generic/Dialog.js";
import { ClockIcon, PowerIcon } from "@heroicons/react/24/outline";
import { Button } from "@components/form/Button.js";
import { Input } from "@components/form/Input.js";

export interface ShutdownDialogProps {
  isOpen: boolean;
  close: () => void;
}

export const ShutdownDialog = ({
  isOpen,
  close
}: ShutdownDialogProps): JSX.Element => {
  const { connection, setDialogOpen } = useDevice();

  const [time, setTime] = useState<number>(5);

  return (
    <Dialog
      title={"Schedule Shutdown"}
      description={"Turn off the connected node after x minutes."}
      isOpen={isOpen}
      close={close}
    >
      <div className="flex gap-2 p-4">
        <Input
          type="number"
          value={time}
          onChange={(e) => setTime(parseInt(e.target.value))}
          action={{
            icon: <ClockIcon className="w-4" />,
            action() {
              connection
                ?.shutdown(time * 60)
                .then(() => setDialogOpen("shutdown", false));
            }
          }}
        />
        <Button
          className="w-24"
          onClick={() => {
            connection
              ?.shutdown(2)
              .then(() => setDialogOpen("shutdown", false));
          }}
        >
          <PowerIcon className="w-4" />
          <span>Now</span>
        </Button>
      </div>
    </Dialog>
  );
};
