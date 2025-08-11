import { create } from "@bufbuild/protobuf";
import { GenericInput } from "@components/Form/FormInput.tsx";
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
import { useDevice } from "@core/stores";
import { zodResolver } from "@hookform/resolvers/zod";
import { Protobuf } from "@meshtastic/core";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod";
import { Label } from "../UI/Label.tsx";

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
}: DeviceNameDialogProps) => {
  const { t } = useTranslation("dialog");
  const { hardware, getNode, connection } = useDevice();
  const myNode = getNode(hardware.myNodeNum);

  const defaultValues = {
    shortName: myNode?.user?.shortName ?? "",
    longName: myNode?.user?.longName ?? "",
  };

  const deviceNameSchema = z.object({
    longName: z
      .string()
      .min(1, t("deviceName.validation.longNameMin"))
      .max(40, t("deviceName.validation.longNameMax")),
    shortName: z
      .string()
      .min(2, t("deviceName.validation.shortNameMin"))
      .max(4, t("deviceName.validation.shortNameMax")),
  });

  const { getValues, reset, control, handleSubmit } = useForm<User>({
    values: defaultValues,
    resolver: zodResolver(deviceNameSchema),
  });

  const onSubmit = handleSubmit((data) => {
    connection?.setOwner(
      create(Protobuf.Mesh.UserSchema, {
        ...data,
      }),
    );
    onOpenChange(false);
  });

  const handleReset = () => {
    reset(defaultValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("deviceName.title")}</DialogTitle>
          <DialogDescription>{t("deviceName.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="longName">{t("deviceName.longName")}</Label>
            <GenericInput
              control={control}
              field={{
                name: "longName",
                label: t("deviceName.longName"),
                type: "text",
                properties: {
                  className: "text-slate-900 dark:text-slate-200",
                  fieldLength: {
                    currentValueLength: getValues("longName").length,
                    max: 40,
                    min: 1,
                    showCharacterCount: true,
                  },
                },
              }}
            />
          </div>
          <div>
            <Label htmlFor="shortName">{t("deviceName.shortName")}</Label>
            <GenericInput
              control={control}
              field={{
                name: "shortName",
                label: t("deviceName.shortName"),
                type: "text",
                properties: {
                  fieldLength: {
                    currentValueLength: getValues("shortName").length,
                    max: 4,
                    min: 1,
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
            <Button type="submit" name="save">
              {t("button.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
