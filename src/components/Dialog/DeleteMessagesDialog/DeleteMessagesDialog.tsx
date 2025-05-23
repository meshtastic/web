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
import { useMessageStore } from "../../../core/stores/messageStore/index.ts";
import { useTranslation } from "react-i18next";

export interface DeleteMessagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteMessagesDialog = ({
  open,
  onOpenChange,
}: DeleteMessagesDialogProps) => {
  const { t } = useTranslation();
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
            {t("dialog_deleteMessages_title")}
          </DialogTitle>
          <DialogDescription>
            {t("dialog_deleteMessages_description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handleCloseDialog}
            name="dismiss"
          >
            {t("dialog_button_dismiss")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              deleteAllMessages();
              handleCloseDialog();
            }}
            name="clearMessages"
          >
            {t("dialog_button_clearMessages")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
