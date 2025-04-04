
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
import { AlertTriangleIcon } from "lucide-react";
import { useMessageStore } from "@core/stores/messageStore.ts";

export interface ClearMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClearMessagesDialog = ({
  open,
  onOpenChange,
}: ClearMessagesDialogProps) => {
  const { clearAllMessages } = useMessageStore();
  const handleCloseDialog = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClick={handleCloseDialog} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-warning" />
            Clear All Messages
          </DialogTitle>
          <DialogDescription>
            This action will clear all message history. This cannot be undone.
            Are you sure you want to continue?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handleCloseDialog}
          >
            Dismiss
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              clearAllMessages();
              handleCloseDialog();
            }}
          >
            Clear Messages
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
