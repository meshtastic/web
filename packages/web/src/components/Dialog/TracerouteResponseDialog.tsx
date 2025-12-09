import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui/Dialog.tsx";
import { useNodes } from "@db/hooks";
import { useDeviceContext } from "@core/stores";
import type { Protobuf, Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useTranslation } from "react-i18next";
import { TraceRoute } from "../PageComponents/Messages/TraceRoute.tsx";

export interface TracerouteResponseDialogProps {
  traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery> | undefined;
  open: boolean;
  onOpenChange: () => void;
}

export const TracerouteResponseDialog = ({
  traceroute,
  open,
  onOpenChange,
}: TracerouteResponseDialogProps) => {
  const { t } = useTranslation("dialog");
  const { deviceId } = useDeviceContext();
  const { nodes: allNodes } = useNodes(deviceId);

  const route: number[] = traceroute?.data.route ?? [];
  const routeBack: number[] = traceroute?.data.routeBack ?? [];
  const snrTowards = (traceroute?.data.snrTowards ?? []).map((snr) => snr / 4);
  const snrBack = (traceroute?.data.snrBack ?? []).map((snr) => snr / 4);

  const from = allNodes.find((n) => n.nodeNum === (traceroute?.to ?? 0)); // The origin of the traceroute = the "to" node of the mesh packet
  const fromLongName =
    from?.longName ??
    (from ? `!${numberToHexUnpadded(from.nodeNum)}` : t("unknown.shortName"));
  const fromShortName =
    from?.shortName ??
    (from
      ? `${numberToHexUnpadded(from.nodeNum).substring(0, 4)}`
      : t("unknown.shortName"));

  const toUser = allNodes.find((n) => n.nodeNum === (traceroute?.from ?? 0)); // The destination of the traceroute = the "from" node of the mesh packet

  if (!toUser || !from) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {t("tracerouteResponse.title", {
              identifier: `${fromLongName} (${fromShortName})`,
            })}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <TraceRoute
            route={route}
            routeBack={routeBack}
            from={{ longName: from.longName, shortName: from.shortName, nodeNum: from.nodeNum }}
            to={{ longName: toUser.longName, shortName: toUser.shortName, nodeNum: toUser.nodeNum }}
            snrTowards={snrTowards}
            snrBack={snrBack}
          />
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
