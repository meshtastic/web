import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { toMGRS } from "@app/core/utils/toMGRS.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { Types } from "@meshtastic/meshtasticjs";

import { BatteryWidget } from "./Widgets/BatteryWidget.js";
import { ConfiguringWidget } from "./Widgets/ConfiguringWidget.js";
import { DeviceWidget } from "./Widgets/DeviceWidget.js";
import { NodeInfoWidget } from "./Widgets/NodeInfoWidget.js";
import { PeersWidget } from "./Widgets/PeersWidget.js";
import { PositionWidget } from "./Widgets/PositionWidget.js";

export const Sidebar = (): JSX.Element => {
  const { removeDevice } = useDeviceStore();
  const { connection, hardware, nodes, status, currentMetrics } = useDevice();
  const { selectedDevice, setSelectedDevice } = useAppStore();
  const myNode = nodes.find((n) => n.data.num === hardware.myNodeNum);

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

      <div className="flex flex-col gap-3">
        <NodeInfoWidget hardware={hardware} />
        <BatteryWidget
          batteryLevel={currentMetrics.batteryLevel}
          voltage={currentMetrics.voltage}
        />
        <PeersWidget
          peers={nodes
            .map((n) => n.data)
            .filter((n) => n.num !== hardware.myNodeNum)}
        />
        <PositionWidget
          grid={toMGRS(
            myNode?.data.position?.latitudeI,
            myNode?.data.position?.longitudeI
          )}
        />

        <ConfiguringWidget />
      </div>
    </div>
  );
};
