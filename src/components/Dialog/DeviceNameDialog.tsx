import { useDevice } from "@app/core/stores/deviceStore.ts";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Input } from "@components/UI/Input.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Protobuf } from "@meshtastic/js";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      })
    );
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Change Device Name")}</DialogTitle>
          <DialogDescription>
            {t("The Device will restart once the config is saved.")}
          </DialogDescription>
        </DialogHeader>
        <div className="gap-4">
          <form onSubmit={onSubmit}>
            <Label>{t("Long Name")}</Label>
            <Input {...register("longName")} />
            <Label>{t("Short Name")}</Label>
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
