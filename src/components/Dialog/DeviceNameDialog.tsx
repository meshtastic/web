import { useDevice } from "@app/core/stores/deviceStore.js";
import { Button } from "@components/UI/Button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.js";
import { Input } from "@components/UI/Input.js";
import { Label } from "@components/UI/Label.js";
import { Protobuf } from "@meshtastic/js";
import { useForm } from "react-hook-form";

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
  onOpenChange,
}: DeviceNameDialogProps): JSX.Element => {
  const { hardware, nodes, connection } = useDevice();

  const myNode = nodes.get(hardware.myNodeNum);

  const { register, handleSubmit } = useForm<User>({
    values: {
      longName: myNode?.user?.longName ?? "Unknown",
      shortName: myNode?.user?.shortName ?? "Unknown",
    },
  });

  const onSubmit = handleSubmit((data) => {
    connection?.setOwner(
      new Protobuf.Mesh.User({
        ...myNode?.user,
        ...data,
      }),
    );
    onOpenChange(false);
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
            <Label>Long Name</Label>
            <Input {...register("longName")} />
            <Label>Short Name</Label>
            <Input maxLength={4} {...register("shortName")} />
          </form>
        </div>
        <DialogFooter>
          <Button onClick={() => onSubmit()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
