import type React from "react";

import { useAppStore } from "@app/core/stores/appStore.js";
import { useDeviceStore } from "@app/core/stores/deviceStore.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { CommandLineIcon, PlusIcon } from "@heroicons/react/24/outline";

import { Mono } from "./Mono.js";

export const DeviceSelector = (): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const { selectedDevice, setSelectedDevice } = useAppStore();

  return (
    <div className="flex h-full w-16 items-center whitespace-nowrap bg-slate-50 pt-12 [writing-mode:vertical-rl]">
      <Mono>Connected Devices</Mono>
      <span className="mt-6 flex gap-4 font-bold text-slate-900">
        {getDevices().map((device) => (
          <div
            key={device.id}
            onClick={() => {
              setSelectedDevice(device.id);
            }}
            className="group flex h-8 w-8 cursor-pointer p-0.5 drop-shadow-md"
          >
            <Hashicon size={32} value={device.hardware.myNodeNum.toString()} />
            <div
              className={`absolute -left-1.5 h-7 w-0.5 rounded-full group-hover:bg-orange-300 ${
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
          className={`h-8 w-8 cursor-pointer rounded-md border-2 border-dashed p-2 hover:border-orange-300 ${
            selectedDevice === 0 ? "border-orange-400" : "border-slate-200"
          }`}
        >
          <PlusIcon />
        </div>
      </span>
      <img src="Logo_Black.svg" className="mt-auto px-3" />
      <div className="my-4 flex flex-col gap-2 [writing-mode:horizontal-tb]">
        <CommandLineIcon className="h-6 text-slate-400" />
        <Mono className="text-xs">
          <kbd className="rounded-md bg-slate-200 p-0.5 pr-1 italic">Ctrl</kbd>+
          <kbd className="rounded-md bg-slate-200 p-0.5 pr-1 italic">K</kbd>
        </Mono>
      </div>
    </div>
  );
};
