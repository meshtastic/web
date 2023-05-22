import { Button } from "@app/components/UI/Button";
import { H3 } from "@app/components/UI/Typography/H3";
import { Subtle } from "@app/components/UI/Typography/Subtle";
import type { FlashState } from "@app/core/flashing/Flasher";
import { type ConfigPreset, useAppStore } from "@app/core/stores/appStore";
import { useDeviceStore, type Device } from "@app/core/stores/deviceStore";
import { PlusIcon, ListPlusIcon, BluetoothIcon, UsbIcon, NetworkIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { FlashSettings } from "./FlashSettings";

export const DeviceList = ({rootConfig, deviceSelectedToFlash, setDeviceSelectedToFlash}:
      {rootConfig: ConfigPreset, deviceSelectedToFlash: FlashState[], setDeviceSelectedToFlash: React.Dispatch<React.SetStateAction<FlashState[]>>}) => {
    const { setConnectDialogOpen, overallFlashingState } = useAppStore();
    const { getDevices } = useDeviceStore();
    const devices = getDevices();
    const allConfigs = rootConfig.getAll();
    const configQueue: string[] = [];
    for(const c in allConfigs) {
      const config = allConfigs[c];
      for (let i = 0; i < config.count; i++) {
          configQueue.push(config.name);
      }
    }
    const configMap = new Map<Device, string | undefined>();
    devices.filter(d => d.flashState.state == "doFlash").forEach(d => configMap.set(d, configQueue.shift()));


    return (
      <div className="flex min-w-[250px]  max-w-[400px] w-full rounded-md border border-dashed border-slate-200 p-3 dark:border-slate-700">
        {devices.length ? (
          <div className="flex flex-col justify-between w-full overflow-y-auto overflow-x-clip">
            <Subtle>Select all devices to flash:</Subtle>
            <ul role="list" className="grow divide-y divide-gray-200">
              {devices.map((device, index) => {
                const state = deviceSelectedToFlash[index];
                return (<DeviceSetupEntry
                  device={device}
                  configName={configMap.get(device)}
                  toggleSelectedToFlash={() => {
                    if(overallFlashingState.state == "busy")
                      return;
                    const newState: FlashState = state.state == 'doFlash' ? {progress: 0, state: 'doNotFlash'} : {progress: 1, state: 'doFlash'};
                    deviceSelectedToFlash[index] = newState;
                    device.setFlashState(newState);
                    setDeviceSelectedToFlash(deviceSelectedToFlash);
                  }}
                  progressText={state}
                />
                );
              })}
              {<div className="m-auto flex flex-col  items-center gap-3 text-center">
                <Button
                  className="mt-3 gap-2"
                  variant="outline"
                  onClick={() => setConnectDialogOpen(true)}
                >
                  <PlusIcon size={16} />
                  New Connection
                </Button>
              </div>}
            </ul>
          </div>
        ) : (
          <div className="m-auto flex flex-col gap-3 text-center">
            <ListPlusIcon size={48} className="mx-auto text-textSecondary" />
            <H3>No Devices</H3>
            <Subtle>Connect atleast one device to get started</Subtle>
            <Button
              className="gap-2"
              onClick={() => setConnectDialogOpen(true)}
            >
              <PlusIcon size={16} />
              New Connection
            </Button>
          </div>
        )}
      </div>
    )
  };

const DeviceSetupEntry = ({device, configName, toggleSelectedToFlash, progressText}
  :{device: Device, configName?: string, toggleSelectedToFlash: () => void, progressText: FlashState}) => {

  const selectedToFlash = progressText.state == "doFlash";
  const buttonCaption = selectedToFlash ? configName ?? "Unassigned" : deviceStateToText(progressText);
  const buttonStyle = deviceStateToStyle(progressText, configName !== undefined);

  return (
    <li key={device.id}>
      <div className="py-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-ellipsis overflow-hidden whitespace-nowrap">
            <p className="truncate text-sm font-medium text-accent">
              {device.nodes.get(device.hardware.myNodeNum)?.user
                ?.longName ?? "<Not flashed yet>"}
            </p>

          </div>
          <div className="flex gap-2 items-center text-sm text-gray-500">

              <Button
                variant={selectedToFlash && !progressText ? "default" : "outline"}
                size="sm"
                style={buttonStyle}
                className="w-[9rem] gap-2 h-8 text-sm text-ellipsis overflow-hidden whitespace-nowrap inline-block"
                onClick={() => toggleSelectedToFlash()}
              >
                {buttonCaption}
              </Button>
            </div>
        </div>
      </div>
    </li>
  );
}



  function deviceStateToText(state: FlashState) {
    switch(state.state) {
      case "doNotFlash":
        return "Skip";
      case "doFlash":
        return "Selected";
      case "preparing":
        return "Preparing...";
      case "erasing":
        return "Erasing...";
      case "flashing":
        return `Flashing... (${(state.progress * 100).toFixed(1)}%)`;
      case "config":
        return "Configuring...";
      case "done":
        return "Completed";
      case "aborted":
        return "Cancelled";
      case "failed":
        return "Failed";
      default:
        return state.state;
    }
  }

  function deviceStateToStyle(state: FlashState, configAssigned: boolean): React.CSSProperties {
    switch(state.state) {
      case "failed":
        return {
          color: "red",
          borderColor: "red"
        };
      case "done":
        return {
          color: "green",
          borderColor: "green"
        };
      case "doNotFlash":
        return {
          color: "gray",
          borderColor: "gray"
        };
      case "doFlash":
        if(!configAssigned) {
          return {
            color: "var(--textPrimary)",
            borderColor: "gray",
            background: `dimgray`
          };
        }
      default:
        return {
          color: "var(--textPrimary)",
          borderColor: "var(--accentMuted)",
          background: `linear-gradient(90deg, var(--accentMuted) ${state.progress * 100}%, transparent ${state.progress * 100}%)`
        };
    }
  }
