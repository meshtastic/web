import type React from "react";

import { useAppStore } from "@app/core/stores/appStore.js";
import { useDeviceStore } from "@app/core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { PlusIcon } from "@heroicons/react/24/outline";

export const DeviceSelector = (): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const { selectedDevice, setSelectedDevice } = useAppStore();

  return (
    <div className="flex bg-slate-50 w-16 items-center whitespace-nowrap py-12 text-sm [writing-mode:vertical-rl] h-full">
      <span className="font-mono text-slate-500">Connected Devices</span>
      <span className="mt-6 flex gap-4 font-bold text-slate-900">
        {getDevices().map((device) => (
          <div
            key={device.id}
            onClick={() => {
              setSelectedDevice(device.id);
            }}
            className="group flex w-8 h-8 p-0.5 cursor-pointer drop-shadow-md"
          >
            <Hashicon size={32} value={device.hardware.myNodeNum.toString()} />
            <div
              className={`absolute -left-1.5 w-0.5 h-7 rounded-full group-hover:bg-orange-300 ${
                device.id === selectedDevice
                  ? "bg-orange-400"
                  : "bg-transparent"
              }`}
            />
          </div>
        ))}
        <div
          onClick={() => {
            setSelectedDevice(0);
          }}
          className={`w-8 h-8 p-2 border-dashed border-2 rounded-md hover:border-orange-300 cursor-pointer ${
            selectedDevice === 0 ? "border-orange-400" : "border-slate-200"
          }`}
        >
          <PlusIcon />
        </div>
      </span>
      <img src="Logo_Black.svg" className="px-3 mt-auto" />
    </div>
  );
};
