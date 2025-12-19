import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog.tsx";
import { useGetMyNode } from "@core/hooks/useGetMyNode";
import { useDeviceContext } from "@core/stores";
import { useNodes } from "@db/hooks";
import { tracerouteRepo } from "@db/repositories";
import type { TracerouteLog } from "@db/schema";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { TraceRoute } from "../PageComponents/Messages/TraceRoute.tsx";

export const TracerouteResponseDialog = () => {
  const { t } = useTranslation("dialog");
  const { deviceId } = useDeviceContext();
  const { nodeMap } = useNodes(deviceId);
  const { myNodeNum, myNode } = useGetMyNode();
  const navigate = useNavigate();

  // Read traceroute param from URL
  const search = useSearch({ strict: false }) as { traceroute?: number };
  const tracerouteNodeNum = search.traceroute;

  const [tracerouteLog, setTracerouteLog] = useState<TracerouteLog | undefined>(
    undefined,
  );

  // Load traceroute from database when param changes
  useEffect(() => {
    if (!tracerouteNodeNum) {
      setTracerouteLog(undefined);
      return;
    }

    tracerouteRepo
      .getLatestTraceroute(deviceId, tracerouteNodeNum)
      .then(setTracerouteLog)
      .catch((error) => {
        console.error("Failed to load traceroute:", error);
        setTracerouteLog(undefined);
      });
  }, [deviceId, tracerouteNodeNum]);

  const handleClose = useCallback(() => {
    // Remove traceroute param from URL
    const currentSearch = new URLSearchParams(window.location.search);
    currentSearch.delete("traceroute");
    navigate({
      to: ".",
      search: Object.fromEntries(currentSearch),
    });
  }, [navigate]);

  const isOpen = tracerouteNodeNum !== undefined && tracerouteLog !== undefined;

  if (!isOpen) {
    return null;
  }

  const route: number[] = tracerouteLog.route ?? [];
  const routeBack: number[] = tracerouteLog.routeBack ?? [];
  const snrTowards = (tracerouteLog.snrTowards ?? []).map((snr) => snr / 4);
  const snrBack = (tracerouteLog.snrBack ?? []).map((snr) => snr / 4);

  const targetNode = nodeMap.get(tracerouteNodeNum);
  const targetLongName =
    targetNode?.longName ?? `!${numberToHexUnpadded(tracerouteNodeNum)}`;
  const targetShortName =
    targetNode?.shortName ??
    `${numberToHexUnpadded(tracerouteNodeNum).slice(-4).toUpperCase()}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            {t("tracerouteResponse.title", {
              identifier: `${targetLongName} (${targetShortName})`,
            })}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <TraceRoute
            route={route}
            routeBack={routeBack}
            from={{
              longName: myNode?.longName ?? null,
              shortName: myNode?.shortName ?? null,
              nodeNum: myNodeNum ?? 0,
            }}
            to={{
              longName: targetNode?.longName ?? null,
              shortName: targetNode?.shortName ?? null,
              nodeNum: tracerouteNodeNum,
            }}
            snrTowards={snrTowards}
            snrBack={snrBack}
          />
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
};
