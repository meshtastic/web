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
  text: {
    title: string;
    description: string;
    button: string;
  };
  open: boolean;
  onOpenChange: () => void;
  onSubmit: () => void;
}

export const PkiRegenerateDialog = ({
  text = {
    title: "Regenerate Key Pair",
    description: "Are you sure you want to regenerate key pair?",
    button: "Regenerate",
  },
  open,
  onOpenChange,
  onSubmit,
}: PkiRegenerateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{text?.title}</DialogTitle>
          <DialogDescription>
            {text?.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={() => onSubmit()}>
            {text?.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
