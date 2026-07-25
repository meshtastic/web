import { DialogWrapper } from "@components/Dialog/DialogWrapper.tsx";
import { useTranslation } from "react-i18next";

interface PacketAuthenticityStrictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PacketAuthenticityStrictDialog = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: PacketAuthenticityStrictDialogProps) => {
  const { t } = useTranslation("dialog");

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      title={t("packetAuthenticityStrict.title")}
      description={t("packetAuthenticityStrict.description")}
      confirmText={t("packetAuthenticityStrict.confirm")}
      cancelText={t("button.cancel")}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};
