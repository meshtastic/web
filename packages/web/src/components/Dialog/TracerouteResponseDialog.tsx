import { useNodeDB } from "@core/stores";
import type { Protobuf, Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useTranslation } from "react-i18next";

import { TraceRoute } from "../PageComponents/Messages/TraceRoute.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../UI/Dialog.tsx";

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
  const { getNode } = useNodeDB();
  const route: number[] = traceroute?.data.route ?? [];
  const routeBack: number[] = traceroute?.data.routeBack ?? [];
  const snrTowards = (traceroute?.data.snrTowards ?? []).map((snr) => snr / 4);
  const snrBack = (traceroute?.data.snrBack ?? []).map((snr) => snr / 4);
  const from = getNode(traceroute?.to ?? 0); // The origin of the traceroute = the "to" node of the mesh packet
  const fromLongName =
    from?.user?.longName ??
    (from ? `!${numberToHexUnpadded(from?.num)}` : t("unknown.shortName"));
  const fromShortName =
    from?.user?.shortName ??
    (from
      ? `${numberToHexUnpadded(from?.num).substring(0, 4)}`
      : t("unknown.shortName"));

  const toUser = getNode(traceroute?.from ?? 0); // The destination of the traceroute = the "from" node of the mesh packet

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
            from={{ user: from.user }}
            to={{ user: toUser.user }}
            snrTowards={snrTowards}
            snrBack={snrBack}
          />
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
