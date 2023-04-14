import { Button } from "@app/components/UI/Button";
import { H3 } from "@app/components/UI/Typography/H3";
import { Subtle } from "@app/components/UI/Typography/Subtle";
import type { FlashState } from "@app/core/flashing/Flasher";
import { type ConfigPreset, useAppStore } from "@app/core/stores/appStore";
import { useDeviceStore, type Device } from "@app/core/stores/deviceStore";
import { PlusIcon, ListPlusIcon, BluetoothIcon, UsbIcon, NetworkIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { FlashSettings } from "./FlashSettings";

export const DeviceList = ({rootConfig, totalConfigCount}: {rootConfig: ConfigPreset, totalConfigCount: number}) => {  
    const { setConnectDialogOpen } = useAppStore();
    const [deviceSelectedToFlash, setDeviceSelectedToFlash] =  useState(new Array<FlashState>(100).fill({progress: 1, state: 'doFlash'})); // TODO: Remove this somehow   
    const { getDevices } = useDeviceStore();  
    const  devices = getDevices();  
  
    return (
      <div className="flex min-w-[500px] rounded-md border border-dashed border-slate-200 p-3 mb-2 dark:border-slate-700">
        {getDevices().length ? (
          <div className="flex flex-col justify-between w-full overflow-y-auto overflow-x-clip">
            <Subtle>Select all devices to flash:</Subtle>
            <ul role="list" className="grow divide-y divide-gray-200">
              {getDevices().map((device, index) => {
                return (<DeviceSetupEntry
                  device={device}
                  selectedToFlash={deviceSelectedToFlash[index].state == 'doFlash'}
                  toggleSelectedToFlash={() => {
                    const newState: FlashState = deviceSelectedToFlash[index].state == 'doFlash' ? {progress: 0, state: 'doNotFlash'} : {progress: 1, state: 'doFlash'};
                    deviceSelectedToFlash[index] = newState;
                    device.setFlashState(newState);
                    setDeviceSelectedToFlash(deviceSelectedToFlash);
                  }}
                  progressText={deviceSelectedToFlash[index]}
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
            <FlashSettings
              deviceSelectedToFlash={deviceSelectedToFlash} setDeviceSelectedToFlash={setDeviceSelectedToFlash} totalConfigCount={totalConfigCount} rootConfig={rootConfig} devices={devices}
            />
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
  
  const DeviceSetupEntry = ({device, selectedToFlash, toggleSelectedToFlash, progressText}
    :{device: Device, selectedToFlash: boolean, toggleSelectedToFlash: () => void, progressText: FlashState}) => {    
  
    return (
      <li key={device.id}>
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <p className="truncate text-sm font-medium text-accent">
                {device.nodes.get(device.hardware.myNodeNum)?.user
                  ?.longName ?? "<Not flashed yet>"}
              </p>
              <div className="inline-flex w-24 justify-center gap-2 rounded-full bg-slate-100 py-1 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-700 hover:text-slate-50">
                {device.connection?.connType === "ble" && (
                  <>
                    <BluetoothIcon size={16} />
                    BLE
                  </>
                )}
                {device.connection?.connType === "serial" && (
                  <>
                    <UsbIcon size={16} />
                    Serial
                  </>
                )}
                {device.connection?.connType === "http" && (
                  <>
                    <NetworkIcon size={16} />
                    Network
                  </>
                )}
              </div>
            </div>          
            <div className="flex gap-2 items-center text-sm text-gray-500" title="Number of peers">
                <UsersIcon
                  size={20}
                  className="text-gray-400"
                  aria-hidden="true"
                />
                {device.nodes.size === 0 ? 0 : device.nodes.size - 1}                        
                <Button
                  variant={selectedToFlash && !progressText ? "default" : "outline"}
                  size="sm"
                  style={deviceStateToStyle(progressText)}
                  className="w-[10rem] gap-2 h-8"
                  onClick={() => toggleSelectedToFlash()}
                >
                  {deviceStateToText(progressText)} {/* TODO: Replace with inner text */}
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
        return "Unselected";
      case "doFlash":
        return "Selected";
      case "connecting":
        return "Connecting...";
      case "erasing":
        return "Erasing...";
      case "flashing":
        return `Flashing... (${(state.progress * 100).toFixed(1)} %)`;
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
  
  function deviceStateToStyle(state: FlashState): React.CSSProperties {  
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
      default:
        return {
          color: "var(--textPrimary)",
          borderColor: "var(--accentMuted)",
          background: `linear-gradient(90deg, var(--accentMuted) ${state.progress * 100}%, transparent ${state.progress * 100}%)`
        };          
    }
  }
  