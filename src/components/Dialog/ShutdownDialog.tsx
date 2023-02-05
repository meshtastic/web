import { useState } from "react";
import { useDevice } from "@core/stores/deviceStore.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@components/UI/Dialog.js";
import { ClockIcon, PowerIcon } from "lucide-react";
import { Button } from "@components/form/Button.js";
import { Input } from "@components/form/Input.js";

export interface ShutdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShutdownDialog = ({
  open,
  onOpenChange
}: ShutdownDialogProps): JSX.Element => {
  const { connection, setDialogOpen } = useDevice();

  const [time, setTime] = useState<number>(5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Shutdown</DialogTitle>
          <DialogDescription>
            Turn off the connected node after x minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 p-4">
          <Input
            type="number"
            value={time}
            onChange={(e) => setTime(parseInt(e.target.value))}
            action={{
              icon: <ClockIcon size={16} />,
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
            <PowerIcon size={16} />
            <span>Now</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
