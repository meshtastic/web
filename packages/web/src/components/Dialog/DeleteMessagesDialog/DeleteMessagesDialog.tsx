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
import { useMessageStore } from "@core/stores";
import { AlertTriangleIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface DeleteMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteMessagesDialog = ({
  open,
  onOpenChange,
}: DeleteMessagesDialogProps) => {
  const { t } = useTranslation("dialog");
  const { deleteAllMessages } = useMessageStore();
  const handleCloseDialog = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose data-testid="dialog-close-button" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-warning" />
            {t("deleteMessages.title")}
          </DialogTitle>
          <DialogDescription>
            {t("deleteMessages.description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleCloseDialog} name="dismiss">
            {t("button.dismiss")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              deleteAllMessages();
              handleCloseDialog();
            }}
            name="clearMessages"
          >
            {t("button.clearMessages")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
