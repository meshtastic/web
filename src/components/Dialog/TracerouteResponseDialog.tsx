import { useDevice } from "@app/core/stores/deviceStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog";
import type { Protobuf, Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import type { JSX } from "react";
import { TraceRoute } from "../PageComponents/Messages/TraceRoute";

export interface TracerouteResponseDialogProps {
  traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery> | undefined;
  open: boolean;
  onOpenChange: () => void;
}

export const TracerouteResponseDialog = ({
  traceroute,
  open,
  onOpenChange,
}: TracerouteResponseDialogProps): JSX.Element => {
  const { nodes } = useDevice();
  const route: number[] = traceroute?.data.route ?? [];
  const routeBack: number[] = traceroute?.data.routeBack ?? [];
  const snrTowards = traceroute?.data.snrTowards ?? [];
  const snrBack = traceroute?.data.snrBack ?? [];
  const from = nodes.get(traceroute?.from ?? 0);
  const longName = from?.user?.longName ??
    (from ? `!${numberToHexUnpadded(from?.num)}` : "Unknown");
  const shortName = from?.user?.shortName ??
    (from ? `${numberToHexUnpadded(from?.num).substring(0, 4)}` : "UNK");
  const to = nodes.get(traceroute?.to ?? 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Traceroute: ${longName} (${shortName})`}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <TraceRoute
            route={route}
            routeBack={routeBack}
            from={from}
            to={to}
            snrTowards={snrTowards}
            snrBack={snrBack}
          />
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
