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

export interface PkiRegenerateDialogProps {
  open: boolean;
  onOpenChange: () => void;
  onSubmit: () => void;
}

export const PkiRegenerateDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: PkiRegenerateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Regenerate Key pair?</DialogTitle>
          <DialogDescription>
            Are you sure you want to regenerate key pair?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={() => onSubmit()}>
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
