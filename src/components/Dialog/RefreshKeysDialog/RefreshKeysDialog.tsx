import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import { LockKeyholeOpenIcon } from "lucide-react";
import { P } from "@components/UI/Typography/P.tsx";
import { useRefreshKeysDialog } from "./useRefreshKeysDialog.ts";

export interface RefreshKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RefreshKeysDialog = ({ open, onOpenChange }: RefreshKeysDialogProps) => {

  const { handleCloseDialog, handleNodeRemove } = useRefreshKeysDialog();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-8 flex flex-col">
        <DialogClose onClick={handleCloseDialog} />
        <DialogHeader>
          <DialogTitle>Keys Mismatch</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-md">
          Your node is unable to send a direct message to this node. This is due to public/private key mismatch.
          <ul className="mt-3">
            <li className="flex place-items-center gap-2 items-start">
              <div className="p-2 bg-slate-500 rounded-lg mt-1 ">
                <LockKeyholeOpenIcon size={30} className="text-white justify-center" />
              </div>
              <div className="flex flex-col gap-2" >
                <P className="font-bold">Refresh this node</P>
                <p>
                  This will remove the node from the chat and request new keys. The process may take a few moments to complete.
                </p>
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
        </DialogDescription>
      </DialogContent>
    </Dialog >
  );
};
