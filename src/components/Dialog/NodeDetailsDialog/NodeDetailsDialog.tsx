import { useEffect, useState } from "react";

import { useAppStore } from "@core/stores/appStore.ts";
import { useDevice } from "@core/stores/deviceStore.ts";
import {
  MessageType,
  useMessageStore,
} from "@core/stores/messageStore/index.ts";
import { Protobuf } from "@meshtastic/core";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { DeviceImage } from "@components/generic/DeviceImage.tsx";
import { TimeAgo } from "@components/generic/TimeAgo.tsx";
import { Uptime } from "@components/generic/Uptime.tsx";
import { toast } from "@core/hooks/useToast.ts";
import { useFavoriteNode } from "../../../core/hooks/useFavoriteNode.ts";
import { useIgnoreNode } from "../../../core/hooks/useIgnoreNode.ts";
import { cn } from "@core/utils/cn.ts";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/UI/Accordion.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog.tsx";
import { Button } from "@components/UI/Button.tsx";
import {
  BellIcon,
  BellOffIcon,
  MapPinnedIcon,
  MessageSquareIcon,
  StarIcon,
  TrashIcon,
  WaypointsIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/UI/Tooltip.tsx";
import { Separator } from "@components/UI/Seperator.tsx";

export interface NodeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeDetailsDialog = ({
  open,
  onOpenChange,
}: NodeDetailsDialogProps) => {
  const { setDialogOpen, connection, setActivePage, getNode } = useDevice();
  const { setNodeNumToBeRemoved, nodeNumDetails } = useAppStore();
  const { setChatType, setActiveChat } = useMessageStore();
  const { updateFavorite } = useFavoriteNode();
  const { updateIgnored } = useIgnoreNode();

  const node = getNode(nodeNumDetails);

  const [isFavoriteState, setIsFavoriteState] = useState<boolean>(
    node?.isFavorite ?? false,
  );
  const [isIgnoredState, setIsIgnoredState] = useState<boolean>(
    node?.isIgnored ?? false,
  );

  useEffect(() => {
    if (!node) return;
    setIsFavoriteState(node?.isFavorite);
    setIsIgnoredState(node?.isIgnored);
  }, [node]);

  if (!node) return;

  function handleDirectMessage() {
    if (!node) return;

    setChatType(MessageType.Direct);
    setActiveChat(node.num);
    setActivePage("messages");
  }

  function handleRequestPosition() {
    if (!node) return;

    toast({
      title: "Requesting position, please wait...",
    });
    connection?.requestPosition(node.num).then(() =>
      toast({
        title: "Position request sent.",
      })
    );
    onOpenChange(false);
  }

  function handleTraceroute() {
    if (!node) return;

    toast({
      title: "Sending Traceroute, please wait...",
    });
    connection?.traceRoute(node.num).then(() =>
      toast({
        title: "Traceroute sent.",
      })
    );
    onOpenChange(false);
  }

  function handleNodeRemove() {
    if (!node) return;

    setNodeNumToBeRemoved(node?.num);
    setDialogOpen("nodeRemoval", true);
    onOpenChange(false);
  }

  function handleToggleFavorite() {
    if (!node) return;

    updateFavorite({ nodeNum: node.num, isFavorite: !isFavoriteState });
    setIsFavoriteState(!isFavoriteState);
  }

  function handleToggleIgnored() {
    if (!node) return;

    updateIgnored({ nodeNum: node.num, isIgnored: !isIgnoredState });
    setIsIgnoredState(!isIgnoredState);
  }

  const deviceMetricsMap = [
    {
      key: "airUtilTx",
      label: "Air TX utilization",
      value: node.deviceMetrics?.airUtilTx,
      format: (val: number) => `${val.toFixed(2)}%`,
    },
    {
      key: "channelUtilization",
      label: "Channel utilization",
      value: node.deviceMetrics?.channelUtilization,
      format: (val: number) => `${val.toFixed(2)}%`,
    },
    {
      key: "batteryLevel",
      label: "Battery level",
      value: node.deviceMetrics?.batteryLevel,
      format: (val: number) => `${val.toFixed(2)}%`,
    },
    {
      key: "voltage",
      label: "Voltage",
      value: node.deviceMetrics?.voltage,
      format: (val: number) => `${val.toFixed(2)}V`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>
            Node Details for {node.user?.longName ?? "UNKNOWN"} (
            {node.user?.shortName ?? "UNK"})
          </DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <div className="w-full">
            <div className="flex flex-row flex-wrap space-y-1">
              <Button className="mr-1" onClick={handleDirectMessage}>
                <MessageSquareIcon className="mr-2" />
                Message
              </Button>
              <Button className="mr-1" onClick={handleTraceroute}>
                <WaypointsIcon className="mr-2" />
                Trace Route
              </Button>
              <Button className="mr-1" onClick={handleToggleFavorite}>
                <StarIcon
                  className={cn(
                    isFavoriteState ? " fill-yellow-400 stroke-yellow-400" : "",
                  )}
                />
              </Button>
              <div className="flex flex-1 justify-start"></div>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className={cn(
                        "flex justify-end mr-1 text-white",
                        isIgnoredState
                          ? "bg-red-500 dark:bg-red-500 hover:bg-red-600 hover:dark:bg-red-600 text-white dark:text-white"
                          : "",
                      )}
                      onClick={handleToggleIgnored}
                    >
                      {isIgnoredState ? <BellIcon /> : <BellOffIcon />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
                    {isIgnoredState ? "Unignore node" : "Ignore node"}
                    <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      className="flex justify-end"
                      onClick={handleNodeRemove}
                    >
                      <TrashIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-4 py-1 rounded text-xs">
                    Remove node
                    <TooltipArrow className="fill-slate-800 dark:fill-slate-600" />
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Separator className="mt-5 mb-2" />

            <div className="flex flex-col flex-wrap space-x-1 space-y-1">
              <div className="flex flex-row space-x-2">
                <div className="w-full bg-slate-100 text-slate-900 dark:text-slate-100 dark:bg-slate-800 p-3  rounded-lg">
                  <p className="text-lg font-semibold">Details:</p>
                  <p>Node Number: {node.num}</p>
                  <p>Node Hex: !{numberToHexUnpadded(node.num)}</p>
                  <p>
                    Role: {Protobuf.Config.Config_DeviceConfig_Role[
                      node.user?.role ?? 0
                    ].replace(/_/g, " ")}
                  </p>
                  <p>
                    Last Heard: {node.lastHeard === 0
                      ? "Never"
                      : <TimeAgo timestamp={node.lastHeard * 1000} />}
                  </p>
                  <p>
                    Hardware:{" "}
                    {(Protobuf.Mesh.HardwareModel[node.user?.hwModel ?? 0] ??
                      "Unknown")
                      .replace(/_/g, " ")}
                  </p>
                </div>
                <DeviceImage
                  className="h-45 w-45 p-2 rounded-lg border-4 border-slate-200 dark:border-slate-800"
                  deviceType={Protobuf.Mesh
                    .HardwareModel[node.user?.hwModel ?? 0]}
                />
              </div>
            </div>

            <div>
              <div className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
                <p className="text-lg font-semibold">Position:</p>

                {node.position
                  ? (
                    <>
                      {node.position.latitudeI &&
                        node.position.longitudeI && (
                        <p>
                          Coordinates:{" "}
                          <a
                            className="text-blue-500 dark:text-blue-400"
                            href={`https://www.openstreetmap.org/?mlat=${
                              node.position.latitudeI / 1e7
                            }&mlon=${node.position.longitudeI / 1e7}&layers=N`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {node.position.latitudeI / 1e7},{" "}
                            {node.position.longitudeI / 1e7}
                          </a>
                        </p>
                      )}
                      {node.position.altitude && (
                        <p>Altitude: {node.position.altitude}m</p>
                      )}
                    </>
                  )
                  : <p>Unknown</p>}
                <Button onClick={handleRequestPosition} className="mt-2">
                  <MapPinnedIcon className="mr-2" />
                  Request Position
                </Button>
              </div>

              {node.deviceMetrics && (
                <div className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Device Metrics:
                  </p>
                  {deviceMetricsMap.map(
                    (metric) =>
                      metric.value !== undefined && (
                        <p key={metric.key}>
                          {metric.label}: {metric.format(metric.value)}
                        </p>
                      ),
                  )}
                  {node.deviceMetrics.uptimeSeconds && (
                    <p>
                      Uptime:{" "}
                      <Uptime seconds={node.deviceMetrics.uptimeSeconds} />
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="text-slate-900 dark:text-slate-100 w-full max-w-[464px] bg-slate-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
              <Accordion className="AccordionRoot" type="single" collapsible>
                <AccordionItem className="AccordionItem" value="item-1">
                  <AccordionTrigger>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                      All Raw Metrics:
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="overflow-x-scroll">
                    <pre className="text-xs w-full">
                      {JSON.stringify(node, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
