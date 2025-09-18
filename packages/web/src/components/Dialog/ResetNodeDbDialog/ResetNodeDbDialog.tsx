import { toast } from "@core/hooks/useToast.ts";
import { useDevice, useMessages, useNodeDB } from "@core/stores";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";

export interface ResetNodeDbDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResetNodeDbDialog = ({
  open,
  onOpenChange,
}: ResetNodeDbDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection } = useDevice();
  const { removeAllNodeErrors, removeAllNodes } = useNodeDB();
  const { deleteAllMessages } = useMessages();

  const handleResetNodeDb = () => {
    connection
      ?.resetNodes()
      .then(() => {
        deleteAllMessages();
        removeAllNodeErrors();
        removeAllNodes(true);
      })
      .catch((error) => {
        toast({
          title: t("resetNodeDb.failedTitle"),
        });
        console.error("Failed to reset Node DB:", error);
      });
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      variant="destructive"
      title={t("resetNodeDb.title")}
      description={t("resetNodeDb.description")}
      confirmText={t("resetNodeDb.confirm")}
      onConfirm={handleResetNodeDb}
    />
  );
};
