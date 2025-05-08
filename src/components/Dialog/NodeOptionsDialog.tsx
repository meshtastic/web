import { toast } from "../../core/hooks/useToast.ts";
import { useAppStore } from "../../core/stores/appStore.ts";
import { useDevice } from "../../core/stores/deviceStore.ts";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../UI/Dialog.tsx";
import type { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { TrashIcon } from "lucide-react";

import { Button } from "../UI/Button.tsx";
import {
  MessageType,
  useMessageStore,
} from "../../core/stores/messageStore/index.ts";

export interface NodeOptionsDialogProps {
  node: Protobuf.Mesh.NodeInfo | undefined;
  open: boolean;
  onOpenChange: () => void;
}

export const NodeOptionsDialog = ({
  node,
  open,
  onOpenChange,
}: NodeOptionsDialogProps) => {
  const { setDialogOpen, connection, setActivePage } = useDevice();
  const {
    setNodeNumToBeRemoved,
    setNodeNumDetails,
  } = useAppStore();
  const { setChatType, setActiveChat } = useMessageStore();

  if (!node) return null;

  const longName = node?.user?.longName ??
    (node ? `!${numberToHexUnpadded(node?.num)}` : "Unknown");
  const shortName = node?.user?.shortName ??
    (node ? `${numberToHexUnpadded(node?.num).substring(0, 4)}` : "UNK");

  function handleDirectMessage() {
    setChatType(MessageType.Direct);
    setActiveChat(node.num);
    setActivePage("messages");
  }

  function handleRequestPosition() {
    toast({
      title: "Requesting position, please wait...",
    });
    connection?.requestPosition(node.num).then(() =>
      toast({
        title: "Position request sent.",
      })
    );
    onOpenChange();
  }

  function handleTraceroute() {
    toast({
      title: "Sending Traceroute, please wait...",
    });
    connection?.traceRoute(node.num).then(() =>
      toast({
        title: "Traceroute sent.",
      })
    );
    onOpenChange();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>{`${longName} (${shortName})`}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-1">
          <div>
            <Button onClick={handleDirectMessage}>Direct Message</Button>
          </div>
          <div>
            <Button onClick={handleRequestPosition}>Request Position</Button>
          </div>
          <div>
            <Button onClick={handleTraceroute}>Trace Route</Button>
          </div>
          <div>
            <Button
              key="remove"
              variant="destructive"
              onClick={() => {
                setNodeNumToBeRemoved(node?.num);
                setDialogOpen("nodeRemoval", true);
              }}
            >
              <TrashIcon />
              Remove
            </Button>
          </div>
          <div>
            <Button
              onClick={() => {
                setNodeNumDetails(node?.num);
                setDialogOpen("nodeDetails", true);
              }}
            >
              More Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
