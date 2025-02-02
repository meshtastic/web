import { useAppStore } from "@app/core/stores/appStore";
import { useDevice } from "@app/core/stores/deviceStore";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/UI/Accordion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@components/UI/Dialog";
import { Protobuf } from "@meshtastic/js";
import { numberToHexUnpadded } from "@noble/curves/abstract/utils";
import { useEffect, useState } from "react";
import { DeviceImage } from "../generic/DeviceImage";
import { TimeAgo } from "../generic/TimeAgo";
import { Uptime } from "../generic/Uptime";

export interface NodeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NodeDetailsDialog = ({
  open,
  onOpenChange,
}: NodeDetailsDialogProps) => {
  const { nodes } = useDevice();
  const { nodeNumDetails } = useAppStore();
  const [device, setDevice] = useState<Protobuf.Mesh.NodeInfo | null>(null);

  useEffect(() => {
    if (!nodeNumDetails) return;
    setDevice(nodes.get(nodeNumDetails));
  }, [nodeNumDetails, nodes]);

  return device ? (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Node Details for {device.user?.longName ?? "UNKNOWN"} (
            {device.user?.shortName ?? "UNK"})
          </DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <div className="w-full">
            <DeviceImage
              className="w-32 h-32 mx-auto rounded-lg border-4 border-gray-200 dark:border-gray-800"
              deviceType={
                Protobuf.Mesh.HardwareModel[device.user?.hwModel ?? 0]
              }
            />
            <div className="mt-5 bg-gray-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Details:
              </p>
              <p>
                Hardware:{" "}
                {Protobuf.Mesh.HardwareModel[device.user?.hwModel ?? 0]}
              </p>
              <p>Node Number: {device.num}</p>
              <p>Node HEX: !{numberToHexUnpadded(device.num)}</p>
              <p>
                Role:{" "}
                {
                  Protobuf.Config.Config_DeviceConfig_Role[
                    device.user?.role ?? 0
                  ]
                }
              </p>
              <p>
                Last Heard:{" "}
                {device.lastHeard === 0 ? (
                  "Never"
                ) : (
                  <TimeAgo timestamp={device.lastHeard * 1000} />
                )}
              </p>
            </div>

            {device.position ? (
              <div className="mt-5 bg-gray-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Position:
                </p>
                {device.position.latitudeI && device.position.longitudeI ? (
                  <p>
                    Coordinates:{" "}
                    <a
                      className="text-blue-500 dark:text-blue-400"
                      href={`https://www.openstreetmap.org/?mlat=${device.position.latitudeI / 1e7}&mlon=${device.position.longitudeI / 1e7}&layers=N`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {device.position.latitudeI / 1e7},{" "}
                      {device.position.longitudeI / 1e7}
                    </a>
                  </p>
                ) : null}
                {device.position.altitude ? (
                  <p>Altitude: {device.position.altitude}m</p>
                ) : null}
              </div>
            ) : null}

            {device.deviceMetrics ? (
              <div className="mt-5 bg-gray-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Device Metrics:
                </p>
                {device.deviceMetrics.airUtilTx ? (
                  <p>
                    Air TX utilization:{" "}
                    {device.deviceMetrics.airUtilTx.toFixed(2)}%
                  </p>
                ) : null}
                {device.deviceMetrics.channelUtilization ? (
                  <p>
                    Channel utilization:{" "}
                    {device.deviceMetrics.channelUtilization.toFixed(2)}%
                  </p>
                ) : null}
                {device.deviceMetrics.batteryLevel ? (
                  <p>
                    Battery level:{" "}
                    {device.deviceMetrics.batteryLevel.toFixed(2)}%
                  </p>
                ) : null}
                {device.deviceMetrics.voltage ? (
                  <p>Voltage: {device.deviceMetrics.voltage.toFixed(2)}V</p>
                ) : null}
                {device.deviceMetrics.uptimeSeconds ? (
                  <p>
                    Uptime:{" "}
                    <Uptime seconds={device.deviceMetrics.uptimeSeconds} />
                  </p>
                ) : null}
              </div>
            ) : null}

            {device ? (
              <div className="mt-5 w-full max-w-[464px] bg-gray-100 dark:bg-slate-800 p-3 rounded-lg mt-3">
                <Accordion className="AccordionRoot" type="single" collapsible>
                  <AccordionItem className="AccordionItem" value="item-1">
                    <AccordionTrigger>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        All Raw Metrics:
                      </p>
                    </AccordionTrigger>
                    <AccordionContent className="overflow-x-scroll">
                      <pre className="text-xs w-full">
                        {JSON.stringify(device, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;
};
