import type React from "react";
import { useEffect, useState } from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { toMGRS } from "@app/core/utils/toMGRS.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";

import { BatteryWidget } from "./Widgets/BatteryWidget.js";
import { ConfiguringWidget } from "./Widgets/ConfiguringWidget.js";
import { DeviceWidget } from "./Widgets/DeviceWidget.js";
import { NodeInfoWidget } from "./Widgets/NodeInfoWidget.js";
import { PeersWidget } from "./Widgets/PeersWidget.js";
import { PositionWidget } from "./Widgets/PositionWidget.js";

export const Sidebar = (): JSX.Element => {
  const { removeDevice } = useDeviceStore();
  const { connection, hardware, nodes, status } = useDevice();
  const { selectedDevice, setSelectedDevice } = useAppStore();
  const [telemtery, setTelemetry] = useState<Protobuf.DeviceMetrics>();
  const [grid, setGrid] = useState<string>("");
  const [batteryHistory, setBatteryHistory] = useState<number[]>([]);

  useEffect(() => {
    const device = nodes.find((n) => n.data.num === hardware.myNodeNum);
    if (device?.deviceMetrics?.length) {
      setTelemetry(device.deviceMetrics[device.deviceMetrics?.length]);
    }
    if (device?.data.position) {
      setGrid(
        toMGRS(device.data.position.latitudeI, device.data.position.longitudeI)
      );
    }
  }, [nodes, hardware.myNodeNum]);

  return (
    <div className="relative flex w-80 flex-shrink-0 flex-col gap-2 border-x border-slate-200 bg-slate-50 p-2">
      <DeviceWidget
        name={
          nodes.find((n) => n.data.num === hardware.myNodeNum)?.data.user
            ?.longName ?? "UNK"
        }
        nodeNum={hardware.myNodeNum.toString()}
        disconnected={status === Types.DeviceStatusEnum.DEVICE_DISCONNECTED}
        disconnect={() => {
          void connection?.disconnect();
          setSelectedDevice(0);
          removeDevice(selectedDevice ?? 0);
        }}
        reconnect={() => {
          console.log("");
        }}
      />

      {/* <div className="text-left">
        <p className="text-xl font-bold text-slate-900">
          <a href="/">Their Side</a>
        </p>
        <p className="mt-3 text-font-medium leading-8 text-slate-700">
          Conversations with the most tragically misunderstood people of our
          time.
        </p>
      </div> */}

      {/*  */}
      {/*  */}
      {/*  */}
      {/*  */}
      <div className="flex flex-col gap-3">
        <NodeInfoWidget hardware={hardware} />
        <BatteryWidget
          batteryLevel={telemtery?.batteryLevel ?? 0}
          voltage={telemtery?.voltage ?? 0}
        />
        <PeersWidget
          peers={nodes
            .map((n) => n.data)
            .filter((n) => n.num !== hardware.myNodeNum)}
        />
        <PositionWidget grid={grid} />

        <ConfiguringWidget />
      </div>
    </div>
  );
};
