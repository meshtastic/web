import type React from "react";
import { useState } from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { Dialog } from "@components/generic/Dialog.js";
import { ArrowPathIcon, ClockIcon } from "@heroicons/react/24/outline";

import { Button } from "../form/Button.js";
import { Input } from "../form/Input.js";

export interface RebootDialogProps {
  isOpen: boolean;
  close: () => void;
}

export const RebootDialog = ({
  isOpen,
  close
}: RebootDialogProps): JSX.Element => {
  const { connection, setRebootDialogOpen } = useDevice();

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
              connection?.reboot({
                time: time * 60,
                callback: async () => {
                  setRebootDialogOpen(false);
                  await Promise.resolve();
                }
              });
            }
          }}
        />
        <Button
          className="w-24"
          variant="secondary"
          iconAfter={<ArrowPathIcon className="w-4" />}
          onClick={() => {
            connection?.reboot({
              time: 0,
              callback: async () => {
                setRebootDialogOpen(false);
                await Promise.resolve();
              }
            });
          }}
        >
          Now
        </Button>
      </div>
    </Dialog>
  );
};
