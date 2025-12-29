import { useTranslation } from "react-i18next";
import { DialogWrapper } from "./DialogWrapper";

export interface PkiRegenerateDialogProps {
  text: {
    title: string;
    description: string;
    button: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      variant="destructive"
      title={text.title || t("pkiRegenerate.title")}
      description={text.description || t("pkiRegenerate.description")}
      confirmText={text.button || t("button.regenerate")}
      onConfirm={onSubmit}
    />
  );
};
