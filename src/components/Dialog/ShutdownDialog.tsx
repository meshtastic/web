import type React from "react";
import { useState } from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { Dialog } from "@components/generic/Dialog.js";
import { ClockIcon, PowerIcon } from "@heroicons/react/24/outline";

import { Button } from "../form/Button.js";
import { Input } from "../form/Input.js";

export interface ShutdownDialogProps {
  isOpen: boolean;
  close: () => void;
}

export const ShutdownDialog = ({
  isOpen,
  close
}: ShutdownDialogProps): JSX.Element => {
  const { connection, setShutdownDialogOpen } = useDevice();

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
              connection?.shutdown({
                time: time * 60,
                callback: async () => {
                  setShutdownDialogOpen(false);
                  await Promise.resolve();
                }
              });
            }
          }}
        />
        <Button
          className="w-24"
          iconBefore={<PowerIcon className="w-4" />}
          onClick={() => {
            connection?.shutdown({
              time: 0,
              callback: async () => {
                setShutdownDialogOpen(false);
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
