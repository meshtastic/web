import { useMessageStore } from "@core/stores";
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
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";

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

  const handleConfirm = () => {
    deleteAllMessages();
  const handleCloseDialog = () => {
    onOpenChange(false);
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      title={t("deleteMessages.title")}
      description={t("deleteMessages.description")}
      icon={<AlertTriangleIcon className="h-5 w-5 text-warning" />}
      variant="destructive"
      confirmText={t("button.clearMessages")}
      cancelText={t("button.dismiss")}
      onConfirm={handleConfirm}
    />
  );
};
