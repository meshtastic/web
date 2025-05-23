import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Link } from "@components/UI/Typography/Link.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useDevice } from "@core/stores/deviceStore.ts";
import { useState } from "react";
import { eventBus } from "@core/utils/eventBus.ts";
import { useTranslation } from "react-i18next";

export interface RouterRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UnsafeRolesDialog = (
  { open, onOpenChange }: RouterRoleDialogProps,
) => {
  const { t } = useTranslation();
  const [confirmState, setConfirmState] = useState(false);
  const { setDialogOpen } = useDevice();

  const deviceRoleLink =
    "https://meshtastic.org/docs/configuration/radio/device/";
  const choosingTheRightDeviceRoleLink =
    "https://meshtastic.org/blog/choosing-the-right-device-role/";

  const handleCloseDialog = (action: "confirm" | "dismiss") => {
    setDialogOpen("unsafeRoles", false);
    setConfirmState(false);
    eventBus.emit("dialog:unsafeRoles", { action });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-8 flex flex-col">
        <DialogClose onClick={() => handleCloseDialog("dismiss")} />
        <DialogHeader>
          <DialogTitle>{t("dialog_unsafeRoles_title")}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-md">
          {t("dialog_unsafeRoles_description_preamble")}
          <Link href={deviceRoleLink} className="">
            {t("dialog_unsafeRoles_link_deviceRoleDocumentation")}
          </Link>
          {t("dialog_unsafeRoles_description_conjunction")}
          <Link href={choosingTheRightDeviceRoleLink}>
            {t("dialog_unsafeRoles_link_choosingRightDeviceRole")}
          </Link>
          {t("dialog_unsafeRoles_description_postamble")}
        </DialogDescription>
        <div className="flex items-center gap-2">
          <Checkbox
            id="routerRole"
            checked={confirmState}
            onChange={() => setConfirmState(!confirmState)}
            name="confirmUnderstanding"
          >
            {t("dialog_unsafeRoles_checkbox_confirmUnderstanding")}
          </Checkbox>
        </div>
        <DialogFooter className="mt-6">
          <Button
            variant="default"
            name="dismiss"
            onClick={() => handleCloseDialog("dismiss")}
          >
            {t("dialog_button_dismiss")}
          </Button>
          <Button
            variant="default"
            name="confirm"
            disabled={!confirmState}
            onClick={() => handleCloseDialog("confirm")}
          >
            {t("dialog_button_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
