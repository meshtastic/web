import { DB_EVENTS, dbEvents } from "@data/events";
import { useNodes } from "@data/hooks";
import { nodeRepo } from "@data/index";
import { Label } from "@shared/components/ui/label";
import { useDevice, useDeviceContext, useUIStore } from "@state/index.ts";
import { useTranslation } from "react-i18next";
import { DialogWrapper } from "./DialogWrapper.tsx";

export interface RemoveNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RemoveNodeDialog = ({
  open,
  onOpenChange,
}: RemoveNodeDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection } = useDevice();
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);
  const { nodeNumToBeRemoved } = useUIStore();

  // Create getNode function from database nodes
  const getNode = (nodeNum: number) => {
    return allNodes.find((n) => n.nodeNum === nodeNum);
  };

  const handleConfirm = async () => {
    // Remove from device's nodeDB
    connection?.removeNodeByNum(nodeNumToBeRemoved);

    // Remove from local database
    await nodeRepo.deleteNode(deviceId, nodeNumToBeRemoved);

    // Emit event to trigger UI refresh
    dbEvents.emit(DB_EVENTS.NODE_UPDATED);
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
        <Label>{getNode(nodeNumToBeRemoved)?.longName}</Label>
      </div>
    </DialogWrapper>
  );
};
