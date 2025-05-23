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
import { useTranslation } from "react-i18next";

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
    title: "", // Default will be set by useTranslation
    description: "", // Default will be set by useTranslation
    button: "", // Default will be set by useTranslation
  },
  open,
  onOpenChange,
  onSubmit,
}: PkiRegenerateDialogProps) => {
  const { t } = useTranslation();
  const dialogText = {
    title: text.title || t("dialog_pkiRegenerate_title_keyPair"),
    description: text.description ||
      t("dialog_pkiRegenerate_description_keyPair"),
    button: text.button || t("dialog_pkiRegenerateDialog_buttonRegenerate"),
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{dialogText.title}</DialogTitle>
          <DialogDescription>
            {dialogText.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            name="regenerate"
            onClick={() => onSubmit()}
          >
            {dialogText.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
