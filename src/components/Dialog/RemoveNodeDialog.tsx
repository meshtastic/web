import { useAppStore } from "@app/core/stores/appStore";
import { useDevice } from "@app/core/stores/deviceStore.js";
import { Button } from "@components/UI/Button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.js";
import { Label } from "@components/UI/Label.js";

export interface RemoveNodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RemoveNodeDialog = ({
  open,
  onOpenChange,
}: RemoveNodeDialogProps): JSX.Element => {
  const { connection, nodes, removeNode } = useDevice();
  const { nodeNumToBeRemoved } = useAppStore();

  const onSubmit = () => {
    connection?.removeNodeByNum(nodeNumToBeRemoved);
    removeNode(nodeNumToBeRemoved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Node?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this Node?
          </DialogDescription>
        </DialogHeader>
        <div className="gap-4">
          <form onSubmit={onSubmit}>
            <Label>{nodes.get(nodeNumToBeRemoved)?.user?.longName}</Label>
          </form>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={() => onSubmit()}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
