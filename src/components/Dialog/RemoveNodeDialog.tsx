import { useAppStore } from "../../core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
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
import { useTranslation } from "react-i18next";

export interface RemoveNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RemoveNodeDialog = ({
  open,
  onOpenChange,
}: RemoveNodeDialogProps) => {
  const { t } = useTranslation();
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
          <DialogTitle>{t("dialog_removeNode_title")}</DialogTitle>
          <DialogDescription>
            {t("dialog_removeNode_description")}
          </DialogDescription>
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
            {t("dialog_button_remove")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
