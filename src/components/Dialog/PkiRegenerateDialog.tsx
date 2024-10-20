import { Button } from "@components/UI/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { useTranslation } from "react-i18next";

export interface PkiRegenerateDialogProps {
  open: boolean;
  onOpenChange: () => void;
  onSubmit: () => void;
}

export const PkiRegenerateDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: PkiRegenerateDialogProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Regenerate Key pair?")}</DialogTitle>
          <DialogDescription>
            {t("Are you sure you want to regenerate key pair?")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={() => onSubmit()}>
            {t("Regenerate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
