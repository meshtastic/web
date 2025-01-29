import { toast } from "@app/core/hooks/useToast";
import { useDevice } from "@app/core/stores/deviceStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog";
import type { Protobuf } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import type { JSX } from "react";
import { Button } from "../UI/Button";

export interface NodeOptionsDialogProps {
  node: Protobuf.Mesh.NodeInfo | undefined;
  open: boolean;
  onOpenChange: () => void;
}

export const NodeOptionsDialog = ({
  node,
  open,
  onOpenChange,
}: NodeOptionsDialogProps): JSX.Element => {
  const { connection } = useDevice();
  const longName =
    node?.user?.longName ??
    (node ? `!${numberToHexUnpadded(node?.num)}` : "Unknown");
  const shortName =
    node?.user?.shortName ??
    (node ? `${numberToHexUnpadded(node?.num).substring(0, 4)}` : "UNK");

  function handleTraceroute() {
    if (!node) return;
    toast({
      title: "Sending Traceroute, please wait...",
    });
    connection?.traceRoute(node.num).then(() =>
      toast({
        title: "Traceroute sent.",
      }),
    );
    onOpenChange();
  }

  function handleRequestPosition() {
    if (!node) return;
    toast({
      title: "Requesting position, please wait...",
    });
    connection?.requestPosition(node.num).then(() =>
      toast({
        title: "Position request sent.",
      }),
    );
    onOpenChange();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`${longName} (${shortName})`}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-1">
          <div>
            <Button onClick={handleTraceroute}>Trace Route</Button>
          </div>
          <div>
            <Button onClick={handleRequestPosition}>Request Position</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
