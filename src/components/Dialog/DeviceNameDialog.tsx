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
import { Protobuf } from "@meshtastic/core";
import { useForm } from "react-hook-form";
import { GenericInput } from "@components/Form/FormInput.tsx";
import { useTranslation } from "react-i18next";
import { validateMaxByteLength } from "@core/utils/string.ts";
import { Label } from "../UI/Label.tsx";

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
  const { t } = useTranslation("dialog");
  const { hardware, getNode, connection } = useDevice();
  const myNode = getNode(hardware.myNodeNum);

  const defaultValues = {
    longName: myNode?.user?.longName ?? t("unknown.longName"),
    shortName: myNode?.user?.shortName ?? t("unknown.shortName"),
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

  if (!myNode?.user) {
    console.warn("DeviceNameDialog: No user data available");
    return null;
  }

  const onSubmit = handleSubmit((data) => {
    connection?.setOwner(
      create(Protobuf.Mesh.UserSchema, {
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
          <DialogTitle>{t("deviceName.title")}</DialogTitle>
          <DialogDescription>
            {t("deviceName.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="longName">
              {t("deviceName.longName")}
            </Label>
            <GenericInput
              control={control}
              field={{
                name: "longName",
                label: t("deviceName.longName"),
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
            <Label htmlFor="shortName">
              {t("deviceName.shortName")}
            </Label>
            <GenericInput
              control={control}
              field={{
                name: "shortName",
                label: t("deviceName.shortName"),
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
            <Button
              type="button"
              variant="destructive"
              name="reset"
              onClick={handleReset}
            >
              {t("button.reset")}
            </Button>
            <Button type="submit" name="save">{t("button.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
