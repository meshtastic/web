import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Link } from "@components/UI/Typography/Link.tsx";
import { Checkbox } from "../../UI/Checkbox/index.tsx";
import { Label } from "@components/UI/Label.tsx";
import { Button } from "@components/UI/Button.tsx";
import { useUnsafeRoles } from "@components/Dialog/UnsafeRolesDialog/useUnsafeRoles.ts";

export interface RouterRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UnsafeRolesDialog = ({ open, onOpenChange }: RouterRoleDialogProps) => {
  const { getConfirmState, toggleConfirmState, handleCloseDialog } = useUnsafeRoles();

  const deivceRoleLink = "https://meshtastic.org/docs/configuration/radio/device/";
  const choosingTheRightDeviceRoleLink = "https://meshtastic.org/blog/choosing-the-right-device-role/";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-8 flex flex-col">
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-md">
          I have read the <Link href={deivceRoleLink} className="">Device Role Documentation</Link>{" "}
          and the blog post about <Link href={choosingTheRightDeviceRoleLink}>Choosing The Right Device Role</Link> and understand the implications of changing the role.
        </DialogDescription>
        <div className="flex items-center gap-2">
          <Checkbox id="routerRole" checked={getConfirmState()} onChange={toggleConfirmState}>
            Yes, I know what I'm doing
          </Checkbox>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="default" name="dismiss" onClick={() => handleCloseDialog("dismiss")}>
            Dismiss
          </Button>
          <Button variant="default" name="confirm" disabled={!getConfirmState()} onClick={() => handleCloseDialog("confirm")}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
