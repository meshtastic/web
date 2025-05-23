import { useDevice } from "../../core/stores/deviceStore.ts";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../UI/Dialog.tsx";
import type { Protobuf, Types } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";

import { TraceRoute } from "../PageComponents/Messages/TraceRoute.tsx";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { getNode } = useDevice();
  const route: number[] = traceroute?.data.route ?? [];
  const routeBack: number[] = traceroute?.data.routeBack ?? [];
  const snrTowards = (traceroute?.data.snrTowards ?? []).map((snr) => snr / 4);
  const snrBack = (traceroute?.data.snrBack ?? []).map((snr) => snr / 4);
  const from = getNode(traceroute?.from ?? 0);
  const longName = from?.user?.longName ??
    (from ? `!${numberToHexUnpadded(from?.num)}` : t("common.unknown"));
  const shortName = from?.user?.shortName ??
    (from
      ? `${numberToHexUnpadded(from?.num).substring(0, 4)}`
      : t("common.unknown"));
  const to = getNode(traceroute?.to ?? 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {t("dialog_tracerouteResponse_titlePrefix")}
            {longName} ({shortName})
          </DialogTitle>
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
