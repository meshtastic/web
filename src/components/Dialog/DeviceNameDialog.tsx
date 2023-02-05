import { Input } from "@components/form/Input.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@components/UI/Dialog.js";
import { Button } from "../form/Button.js";
import { useDevice } from "@app/core/stores/deviceStore.js";
import { useForm } from "react-hook-form";
import { Protobuf } from "@meshtastic/meshtasticjs";

export interface User {
  longName: string;
  shortName: string;
}

export interface DeviceNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeviceNameDialog = ({
  open,
  onOpenChange
}: DeviceNameDialogProps): JSX.Element => {
  const { hardware, nodes, connection, setDialogOpen } = useDevice();

  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

  const { register, handleSubmit } = useForm<User>({
    defaultValues: {
      longName: myNode?.data.user?.longName,
      shortName: myNode?.data.user?.shortName
    }
  });

  const onSubmit = handleSubmit((data) => {
    connection?.setOwner(
      new Protobuf.User({
        ...myNode?.data.user,
        ...data
      })
    );
    setDialogOpen("deviceName", false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Device Name</DialogTitle>
          <DialogDescription>
            The Device will restart once the config is saved.
          </DialogDescription>
        </DialogHeader>
        <div className="gap-4">
          <form onSubmit={onSubmit}>
            <Input
              label="Long Name"
              description="Personalised name for this device."
              {...register("longName")}
            />
            <Input
              label="Short Name"
              description="Shown on small screens."
              maxLength={4}
              {...register("shortName")}
            />
          </form>
        </div>
        <DialogFooter>
          <Button onClick={() => onSubmit()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
