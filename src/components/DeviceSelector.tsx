import type React from "react";

import { useAppStore } from "@app/core/stores/appStore.js";
import { useDeviceStore } from "@app/core/stores/deviceStore.js";
import { Mono } from "@components/generic/Mono.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { MoonIcon, PlusIcon } from "@heroicons/react/24/outline";
import { IconButton } from "./form/IconButton.js";

export const DeviceSelector = (): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const { selectedDevice, setSelectedDevice, darkMode } = useAppStore();

  return (
    <div className="flex h-full w-16 items-center whitespace-nowrap bg-backgroundPrimary pt-12 [writing-mode:vertical-rl]">
      <Mono>Connected Devices</Mono>
      <span className="mt-6 flex gap-4 font-bold text-textPrimary">
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
              className={`absolute -left-1.5 h-7 w-0.5 rounded-full group-hover:bg-accent ${
                device.id === selectedDevice ? "bg-accent" : "bg-transparent"
              }`}
            />
          </div>
        ))}
        <div
          onClick={() => {
            setSelectedDevice(0);
          }}
          className={`h-8 w-8 cursor-pointer rounded-md border-2 border-dashed p-2 hover:border-accent ${
            selectedDevice === 0 ? "border-accent" : "border-textSecondary"
          }`}
        >
          <PlusIcon />
        </div>
      </span>
      <img
        src={darkMode ? "Logo_White.svg" : "Logo_Black.svg"}
        className="mt-auto px-3 py-4"
      />
    </div>
  );
};
