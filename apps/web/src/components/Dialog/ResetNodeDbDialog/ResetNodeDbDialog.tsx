import { toast } from "@core/hooks/useToast.ts";
import { useNodeDB } from "@core/stores";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "../DialogWrapper.tsx";

export interface ResetNodeDbDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResetNodeDbDialog = ({ open, onOpenChange }: ResetNodeDbDialogProps) => {
  const { t } = useTranslation("dialog");
  const meshClient = useActiveClient();
  // PKI-error tracking still lives on the legacy nodeDB store; clear it
  // here until that subsystem is migrated to the SDK.
  const { removeAllNodeErrors, removeAllNodes } = useNodeDB();

  const handleResetNodeDb = () => {
    if (!meshClient) return;
    meshClient.nodes
      .reset()
      .then((result) => {
        if (result.status === "error") throw result.error;
        return meshClient.chat.clearAll();
      })
      .then(() => {
        removeAllNodeErrors();
        removeAllNodes(true);
      })
      .catch((error) => {
        toast({ title: t("resetNodeDb.failedTitle") });
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
