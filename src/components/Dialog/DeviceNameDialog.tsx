import { useDevice } from "@core/stores/deviceStore.ts";
import { create } from "@bufbuild/protobuf";
import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Protobuf } from "@meshtastic/core";
import { useForm } from "react-hook-form";
import { GenericInput } from "@components/Form/FormInput.tsx";
import { validateMaxByteLength } from "@core/utils/string.ts";

export interface User {
  longName: string;
  shortName: string;
}

export interface DeviceNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const MAX_LONG_NAME_BYTE_LENGTH = 40;
const MAX_SHORT_NAME_BYTE_LENGTH = 4;

export const DeviceNameDialog = ({
  open,
  onOpenChange,
}: DeviceNameDialogProps) => {
  const { hardware, getNode, connection } = useDevice();
  const myNode = getNode(hardware.myNodeNum);

  const defaultValues = {
    longName: myNode?.user?.longName ?? "Unknown",
    shortName: myNode?.user?.shortName ?? "??",
  };

  const { getValues, setValue, reset, control, handleSubmit } = useForm<User>({
    values: defaultValues,
  });

  const { currentLength: currentLongNameLength } = validateMaxByteLength(
    getValues("longName"),
    MAX_LONG_NAME_BYTE_LENGTH,
  );
  const { currentLength: currentShortNameLength } = validateMaxByteLength(
    getValues("shortName"),
    MAX_SHORT_NAME_BYTE_LENGTH,
  );

  const onSubmit = handleSubmit((data) => {
    connection?.setOwner(
      create(Protobuf.Mesh.UserSchema, {
        ...(myNode?.user ?? {}),
        ...data,
      }),
    );
    onOpenChange(false);
  });

  const handleReset = () => {
    reset({ longName: "", shortName: "" });
    setValue("longName", "");
    setValue("shortName", "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Change Device Name</DialogTitle>
          <DialogDescription>
            The Device will restart once the config is saved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="longName">Long Name</Label>
            <GenericInput
              control={control}
              field={{
                name: "longName",
                label: "Long Name",
                type: "text",
                properties: {
                  className: "text-slate-900 dark:text-slate-200",
                  fieldLength: {
                    currentValueLength: currentLongNameLength ?? 0,
                    max: MAX_LONG_NAME_BYTE_LENGTH,
                    showCharacterCount: true,
                  },
                },
              }}
            />
          </div>
          <div>
            <Label htmlFor="shortName">Short Name</Label>
            <GenericInput
              control={control}
              field={{
                name: "shortName",
                label: "Short Name",
                type: "text",
                properties: {
                  fieldLength: {
                    currentValueLength: currentShortNameLength ?? 0,
                    max: MAX_SHORT_NAME_BYTE_LENGTH,
                    showCharacterCount: true,
                  },
                },
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="destructive" onClick={handleReset}>
              Reset
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
