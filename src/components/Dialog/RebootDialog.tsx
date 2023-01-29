import { useState } from "react";
import { useDevice } from "@core/providers/useDevice.js";
import { Dialog } from "@components/generic/Dialog.js";
import { ArrowPathIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Button } from "@components/form/Button.js";
import { Input } from "@components/form/Input.js";

export interface RebootDialogProps {
  isOpen: boolean;
  close: () => void;
}

export const RebootDialog = ({
  isOpen,
  close
}: RebootDialogProps): JSX.Element => {
  const { connection, setDialogOpen } = useDevice();

  const [time, setTime] = useState<number>(5);

  return (
    <Dialog
      title={"Schedule Reboot"}
      description={"Reboot the connected node after x minutes."}
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
                ?.reboot(time * 60)
                .then(() => setDialogOpen("reboot", false));
            }
          }}
        />
        <Button
          className="w-24"
          iconBefore={<ArrowPathIcon className="w-4" />}
          onClick={() => {
            connection?.reboot(2).then(() => setDialogOpen("reboot", false));
          }}
        >
          Now
        </Button>
      </div>
    </Dialog>
  );
};
