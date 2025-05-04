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

export interface RouterRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UnsafeRolesDialog = (
  { open, onOpenChange }: RouterRoleDialogProps,
) => {
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
          <DialogTitle>Are you sure?</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-md">
          I have read the{" "}
          <Link href={deviceRoleLink} className="">
            Device Role Documentation
          </Link>{" "}
          and the blog post about{" "}
          <Link href={choosingTheRightDeviceRoleLink}>
            Choosing The Right Device Role
          </Link>{" "}
          and understand the implications of changing the role.
        </DialogDescription>
        <div className="flex items-center gap-2">
          <Checkbox
            id="routerRole"
            checked={confirmState}
            onChange={() => setConfirmState(!confirmState)}
          >
            Yes, I know what I'm doing
          </Checkbox>
        </div>
        <DialogFooter className="mt-6">
          <Button
            variant="default"
            name="dismiss"
            onClick={() => handleCloseDialog("dismiss")}
          >
            Dismiss
          </Button>
          <Button
            variant="default"
            name="confirm"
            disabled={!confirmState}
            onClick={() => handleCloseDialog("confirm")}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
