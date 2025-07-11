import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { ConnectionTabs } from "@components/ConnectionTabs/ConnectionTabs.tsx";
import { useTranslation } from "react-i18next";

export interface NewConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewConnectionDialog = ({
  open,
  onOpenChange,
}: NewConnectionDialogProps) => {
  const { t } = useTranslation("dialog");

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t("newDeviceDialog.title")}
          </DialogTitle>
        </DialogHeader>

        <ConnectionTabs closeDialog={handleClose} />
      </DialogContent>
    </Dialog>
  );
};
