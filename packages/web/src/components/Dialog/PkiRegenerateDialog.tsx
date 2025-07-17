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
    title: "",
    description: "",
    button: "",
  },
  open,
  onOpenChange,
  onSubmit,
}: PkiRegenerateDialogProps) => {
  const { t } = useTranslation("dialog");
  const dialogText = {
    title: text.title || t("pkiRegenerate.title"),
    description: text.description || t("pkiRegenerate.description"),
    button: text.button || t("button.regenerate"),
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{dialogText.title}</DialogTitle>
          <DialogDescription>{dialogText.description}</DialogDescription>
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
