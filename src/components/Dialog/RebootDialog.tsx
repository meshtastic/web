import { useState } from "react";
import { useDevice } from "@core/stores/deviceStore.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@components/UI/Dialog.js";
import { ClockIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@components/UI/Button.js";
import { Input } from "@components/form/Input.js";

export interface RebootDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RebootDialog = ({
  open,
  onOpenChange
}: RebootDialogProps): JSX.Element => {
  const { connection, setDialogOpen } = useDevice();

  const [time, setTime] = useState<number>(5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Reboot</DialogTitle>
          <DialogDescription>
            Reboot the connected node after x minutes.
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
                  ?.reboot(time * 60)
                  .then(() => setDialogOpen("reboot", false));
              }
            }}
          />
          <Button
            className="w-24"
            onClick={() => {
              connection?.reboot(2).then(() => setDialogOpen("reboot", false));
            }}
          >
            <RefreshCwIcon size={16} />
            Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
