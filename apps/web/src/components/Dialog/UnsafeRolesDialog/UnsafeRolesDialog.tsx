import { Button } from "@components/UI/Button.tsx";
import { Checkbox } from "@components/UI/Checkbox/index.tsx";
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
import { useDevice } from "@core/stores";
import { eventBus } from "@core/utils/eventBus.ts";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface RouterRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UnsafeRolesDialog = ({
  open,
  onOpenChange,
}: RouterRoleDialogProps) => {
  const { t } = useTranslation("dialog");
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
          <DialogTitle>{t("unsafeRoles.title")}</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-md">
          {t("unsafeRoles.preamble")}
          <Link href={deviceRoleLink} className="">
            {t("unsafeRoles.deviceRoleDocumentation")}
          </Link>
          {t("unsafeRoles.conjunction")}
          <Link href={choosingTheRightDeviceRoleLink}>
            {t("unsafeRoles.choosingRightDeviceRole")}
          </Link>
          {t("unsafeRoles.postamble")}
        </DialogDescription>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={confirmState}
            onChange={() => setConfirmState(!confirmState)}
            name="confirmUnderstanding"
          >
            <span className="dark:text-white">
              {t("unsafeRoles.confirmUnderstanding")}
            </span>
          </Checkbox>
        </div>
        <DialogFooter className="mt-6">
          <Button
            variant="default"
            name="dismiss"
            onClick={() => handleCloseDialog("dismiss")}
          >
            {t("button.dismiss")}
          </Button>
          <Button
            variant="default"
            name="confirm"
            disabled={!confirmState}
            onClick={() => handleCloseDialog("confirm")}
          >
            {t("button.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
