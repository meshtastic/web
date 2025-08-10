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
import { Label } from "@components/UI/Label.tsx";
import { useAppStore, useDevice } from "@core/stores";
import { useTranslation } from "react-i18next";

export interface RemoveNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RemoveNodeDialog = ({
  open,
  onOpenChange,
}: RemoveNodeDialogProps) => {
  const { t } = useTranslation("dialog");
  const { connection, getNode, removeNode } = useDevice();
  const { nodeNumToBeRemoved } = useAppStore();

  const onSubmit = () => {
    connection?.removeNodeByNum(nodeNumToBeRemoved);
    removeNode(nodeNumToBeRemoved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{t("removeNode.title")}</DialogTitle>
          <DialogDescription>{t("removeNode.description")}</DialogDescription>
        </DialogHeader>
        <div className="gap-4">
          <form onSubmit={onSubmit}>
            <Label>{getNode(nodeNumToBeRemoved)?.user?.longName}</Label>
          </form>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            name="remove"
            onClick={() => onSubmit()}
          >
            {t("button.remove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
