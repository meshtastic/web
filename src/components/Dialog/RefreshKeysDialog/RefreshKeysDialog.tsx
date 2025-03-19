import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { LockKeyholeOpenIcon } from "lucide-react";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";

export interface RefreshKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RefreshKeysDialog = ({ open, onOpenChange }: RefreshKeysDialogProps) => {

  const { handleCloseDialog, handleNodeRemove } = useRefreshKeysDialog();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-8 flex flex-col gap-2">
        <DialogClose onClick={handleCloseDialog} />
        <DialogHeader>
          <DialogTitle>Keys Mismatch</DialogTitle>
        </DialogHeader>
        Your node is unable to send a direct message to this node. This is due to the remote node's current public key not matching the previously stored key for this node.
        <ul className="mt-2">
          <li className="flex place-items-center gap-2 items-start">
            <div className="p-2 bg-slate-500 rounded-lg mt-1">
              <LockKeyholeOpenIcon size={30} className="text-white justify-center" />
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <p className="font-bold mb-0.5">Accept New Keys</p>
                <p>
                  This will remove the node from device and request new keys.
                </p>
              </div>
              <Button
                variant="default"
                onClick={handleNodeRemove}
                className=""
              >
                Request New Keys
              </Button>
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className=""
              >
                Dismiss
              </Button>
            </div>
          </li>
        </ul>
        {/* </DialogDescription> */}
      </DialogContent>
    </Dialog >
  );
};
