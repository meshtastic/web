import { ConfigPreset, useAppStore } from "@app/core/stores/appStore.js";
import { Button } from "@components/UI/Button.js";
import {
  PlusIcon,
  ListPlusIcon,
  UsersIcon,
  MapPinIcon,
  CalendarIcon,
  BluetoothIcon,
  UsbIcon,
  NetworkIcon
} from "lucide-react";
import { Subtle } from "@components/UI/Typography/Subtle.js";
import { H3 } from "@components/UI/Typography/H3.js";
import { Device, useDeviceStore } from "@app/core/stores/deviceStore.js";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Separator } from "@components/UI/Seperator.js";
import { Mono } from "./generic/Mono";
import { DeviceWrapper } from "@app/DeviceWrapper";
import { DeviceConfig } from "@app/pages/Config/DeviceConfig";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { SidebarButton } from "./UI/Sidebar/sidebarButton";
import { ConfigSelectButton } from "./UI/ConfigSelectButton";

export const Dashboard = () => {
  const { setConfigPresetRoot } = useAppStore();
  let { configPresetRoot } : {configPresetRoot: ConfigPreset} = useAppStore();
  const { getDevices } = useDeviceStore();  

  const devices: Device[] = useMemo(() => getDevices(), [getDevices]);  
  
  if(configPresetRoot == undefined && devices.length > 0) {
    // Initialize configs if none exist yet    
    const basicConfig: ConfigPreset = new ConfigPreset("Root", devices[0].config /* TEMP ONLY */);
    basicConfig.children.push(new ConfigPreset("Preset 0", devices[0].config));
    setConfigPresetRoot(basicConfig);        
    configPresetRoot = useAppStore().configPresetRoot;    
  }    
  //const totalConfigCount = configPresetRoot.children.reduce((r, p) => r + p.count, 0);
  
  return (
    <div className="flex flex-col h-full gap-3 p-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <H3>Connected Devices</H3>
          <Subtle>Manage, connect and disconnect devices</Subtle>
        </div>
      </div>

      <Separator />

      <div className="flex w-full h-full gap-3">
        <div className="flex flex-col w-[400px] h-full">
          <DeviceList devices={devices} /*umSelectedConfigs={}*//>
          <ConfigList rootConfig={configPresetRoot}/>
        </div>
        {devices.length > 0 ? (        
        // <DeviceWrapper device={devices[0]}>
          <div className="flex w-full h-full"><DeviceConfig/></div>
        // </DeviceWrapper>
        ) : <div/>}
      </div>
    </div>
  );
};

const DeviceList = ({devices/*, numSelectedConfigs*/}: {devices: Device[]/*, numSelectedConfigs: number*/}) => {  
  const { setConnectDialogOpen } = useAppStore();  
    
  const [devicesToFlash, setDevicesToFlashFlash] = useState(devices.map(d => d.selectedToFlash));
 
  return (
    <div className="flex rounded-md border border-dashed border-slate-200 h-1/2 p-3 mb-2 dark:border-slate-700">
      {devices.length ? (
        <div className="flex flex-col justify-between w-full">        
          <ul role="list" className="grow divide-y divide-gray-200">
            {devices.map((device, index) => {
              return (
                <li key={device.id}>
                  <div className="py-4">
                    <div className="flex items-center justify-between">
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
                    <div className="mt-1 sm:flex sm:justify-between">
                      <div className="flex gap-2 w-full items-center text-sm text-gray-500">
                        <UsersIcon
                          size={20}
                          className="text-gray-400"
                          aria-hidden="true"
                        />
                        {device.nodes.size === 0 ? 0 : device.nodes.size - 1}
                        <Button
                          variant={devicesToFlash[index] ? "default" : "outline"}
                          size="sm"
                          className="w-full gap-2 h-8"
                          onClick={() => {         
                            // TODO: HACKY AF, fix.
                            // Used to make sure page rerenders but this has issues
                            devicesToFlash[index] = !devicesToFlash[index];                 
                            device.setSelectedToFlash(!devicesToFlash[index]);
                            setDevicesToFlashFlash(devicesToFlash);
                            // devicesToFlash[index] = !devicesToFlash[index];                
                            // console.log(`Set device ${index}: ${devicesToFlash[index]}`);                          
                            // toggleDeviceFlash(device);                          
                          }}
                        >
                          {devicesToFlash[index] ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                      
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button
            className="gap-2"
            onClick={() => setConnectDialogOpen(true)}            
          >            
            Flash
          </Button>
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


const ConfigList = ({rootConfig}: {rootConfig: ConfigPreset}) => {
  
  const { setConfigPresetRoot, configPresetSelected, setConfigPresetSelected } = useAppStore();
  const [dummyState, setDummyState] = useState(0);

  return (
    <div className="flex flex-col rounded-md border border-dashed border-slate-200 h-1/2 p-3 mb-2 dark:border-slate-700">
      <button        
        className="transition-all hover:text-accent mb-4"
        onClick={() => {
          rootConfig?.children.push(new ConfigPreset(`Preset ${rootConfig.children.length}`, rootConfig.children[0]));
          setDummyState(dummyState + 1);
        }}
      >
        <PlusIcon/>
      </button>
      {rootConfig ? rootConfig.children.map((config, index) => {
        return (<ConfigSelectButton
          label={config.name}
          active={index == configPresetSelected}
          setValue={(value) => {config.count = value; setDummyState(dummyState + 1)}}
          value={config.count}
          onClick={() => setConfigPresetSelected(index)}
          />)
      }) : <div/>}
    </div>
  )

};