import type React from "react";

import { useDevice } from "@app/core/providers/useDevice.js";
import { useAppStore } from "@core/stores/appStore.js";
import { useDeviceStore } from "@core/stores/deviceStore.js";
import { Types } from "@meshtastic/meshtasticjs";

import { ConfiguringWidget } from "./Widgets/ConfiguringWidget.js";
import { DeviceWidget } from "./Widgets/DeviceWidget.js";
import { NodeInfoWidget } from "./Widgets/NodeInfoWidget.js";
import { PeersWidget } from "./Widgets/PeersWidget.js";
import { PositionWidget } from "./Widgets/PositionWidget.js";

export const Sidebar = (): JSX.Element => {
  const { removeDevice } = useDeviceStore();
  const { connection, hardware, nodes, status } = useDevice();
  const { selectedDevice, setSelectedDevice } = useAppStore();

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
      <div className="space-y-6">
        <div>
          <h3 className="font-medium text-gray-900">Information</h3>
          <dl className="mt-2 divide-y divide-gray-200 border-t border-b border-gray-200">
            <div className="flex justify-between py-3 text-sm font-medium">
              <dt className="text-gray-500">Firmware version</dt>
              <dd className="cursor-pointer whitespace-nowrap text-gray-900 hover:text-orange-400 hover:underline">
                {hardware.firmwareVersion}
              </dd>
            </div>
          </dl>
          <div className="flex justify-between py-3 text-sm font-medium">
            <dt className="text-gray-500">Bitrate</dt>
            <dd className="whitespace-nowrap text-gray-900">
              {hardware.bitrate.toFixed(2)}
              <span className="font-mono text-sm text-slate-500 ">bps</span>
            </dd>
          </div>
        </div>
        <NodeInfoWidget />
        {/* <BatteryWidget /> */}
        <PeersWidget />
        <PositionWidget />

        <ConfiguringWidget />
      </div>
    </div>
  );
};
