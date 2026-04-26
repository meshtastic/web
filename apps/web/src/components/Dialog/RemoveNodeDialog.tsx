import { Label } from "@components/UI/Label.tsx";
import { useNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useAppStore } from "@core/stores";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "./DialogWrapper.tsx";

export interface RemoveNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RemoveNodeDialog = ({ open, onOpenChange }: RemoveNodeDialogProps) => {
  const { t } = useTranslation("dialog");
  const meshClient = useActiveClient();
  const { nodeNumToBeRemoved } = useAppStore();
  const node = useNodeAsProto(nodeNumToBeRemoved);

  const handleConfirm = () => {
    void meshClient?.nodes.remove(nodeNumToBeRemoved);
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      type="confirm"
      title={t("removeNode.title")}
      description={t("removeNode.description")}
      variant="destructive"
      confirmText={t("button.remove")}
      onConfirm={handleConfirm}
    >
      <div className="gap-4">
        <Label>{node?.user?.longName}</Label>
      </div>
    </DialogWrapper>
  );
};
