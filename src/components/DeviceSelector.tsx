import type React from "react";

import { useAppStore } from "@app/core/stores/appStore.js";
import { useDeviceStore } from "@app/core/stores/deviceStore.js";
import { NavSpacer } from "@app/Nav/NavSpacer.js";
import { PageNav } from "@app/Nav/PageNav.js";
import { Mono } from "@components/generic/Mono.js";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { PlusIcon } from "@heroicons/react/24/outline";

export const DeviceSelector = (): JSX.Element => {
  const { getDevices } = useDeviceStore();
  const { selectedDevice, setSelectedDevice, darkMode } = useAppStore();

  return (
    <div className="flex h-full w-14 items-center gap-3 bg-backgroundPrimary pt-3 [writing-mode:vertical-rl]">
      <div className="flex items-center gap-3">
        <Mono className="select-none">Connected Devices</Mono>
        <span className="flex font-bold text-textPrimary">
          {getDevices().map((device) => (
            <div
              key={device.id}
              onClick={() => {
                setSelectedDevice(device.id);
              }}
              className={`cursor-pointer border-x-4 border-backgroundPrimary bg-backgroundPrimary py-3 px-2 hover:brightness-hover active:brightness-press ${
                selectedDevice === device.id ? "border-l-accent" : ""
              }`}
            >
              <Hashicon
                size={32}
                value={device.hardware.myNodeNum.toString()}
              />
            </div>
          ))}
          <div
            onClick={() => {
              setSelectedDevice(0);
            }}
            className={`cursor-pointer border-x-4 border-backgroundPrimary bg-backgroundPrimary py-4 px-3 hover:brightness-hover active:brightness-press ${
              selectedDevice === 0 ? "border-l-accent" : ""
            }`}
          >
            <PlusIcon className="w-6" />
          </div>
        </span>
      </div>

      {selectedDevice !== 0 && (
        <>
          <NavSpacer />
          <PageNav />
        </>
      )}

      <NavSpacer />

      <div>//actions</div>

      <img
        src={darkMode ? "Logo_White.svg" : "Logo_Black.svg"}
        className="mt-auto px-2 py-3"
      />
    </div>
  );
};
