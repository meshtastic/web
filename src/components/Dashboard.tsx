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
import { Device, useDevice, useDeviceStore } from "@app/core/stores/deviceStore.js";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Separator } from "@components/UI/Seperator.js";
import { Mono } from "./generic/Mono";
import { DeviceWrapper } from "@app/DeviceWrapper";
import { DeviceConfig } from "@app/pages/Config/DeviceConfig";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { SidebarButton } from "./UI/Sidebar/sidebarButton";
import { ConfigSelectButton } from "./UI/ConfigSelectButton";
import { Flasher, FlashOperation, FlashState } from "@app/core/flashing/Flasher";

export const Dashboard = () => {
  const { setConfigPresetRoot } = useAppStore();
  let { configPresetRoot, configPresetSelected } : {configPresetRoot: ConfigPreset, configPresetSelected?: ConfigPreset} = useAppStore();
  const { getDevices } = useDeviceStore();  

  const devices: Device[] = useMemo(() => getDevices(), [getDevices]);  
  
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
          <DeviceList devices={devices} rootConfig={configPresetRoot}/>
          <ConfigList rootConfig={configPresetRoot}/>
        </div>
        <div className="flex w-full h-full"><DeviceConfig key={configPresetSelected?.name}/></div>
      </div>
    </div>
  );
};

const DeviceList = ({devices, rootConfig}: {devices: Device[], rootConfig: ConfigPreset}) => {  
  const { setConnectDialogOpen, flasher } = useAppStore();
  const [deviceSelectedToFlash, setDeviceSelectedToFlash] = useState(devices.map(d => d.flashState));
  // const [flashingState, setFlashingState]: any = useState([]);
 
  return (
    <div className="flex rounded-md border border-dashed border-slate-200 h-1/2 p-3 mb-2 dark:border-slate-700">
      {devices.length ? (
        <div className="flex flex-col justify-between w-full">        
          <ul role="list" className="grow divide-y divide-gray-200">
            {devices.map((device, index) => {
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
          </ul>
          {deviceSelectedToFlash.filter(d => d).length > 0 && <Button
            className="gap-2"
            onClick={() => {              
              flasher.flashAll(devices, rootConfig.children, (f)=> {
                f.device.setFlashState(f.state);
                deviceSelectedToFlash[devices.indexOf(f.device)] = f.state;
                setDeviceSelectedToFlash(deviceSelectedToFlash);
                // flashingState[f.device.id] = f.state;
                // setFlashingState(flashingState);
                debugger;
              });
            }}
          >            
            Flash
          </Button>}
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
  
  const { configPresetRoot, setConfigPresetRoot, configPresetSelected, setConfigPresetSelected } = useAppStore();
  if(configPresetSelected === undefined) {
    setConfigPresetSelected(configPresetRoot);
    return (<div/>);    
  }    

  return (
    <div className="flex flex-col rounded-md border border-dashed border-slate-200 h-1/2 p-3 mb-2 dark:border-slate-700">
      <button        
        className="transition-all hover:text-accent mb-4"
        onClick={() => {         
          const newPreset = new ConfigPreset(`Preset ${/*configPresetSelected.children.length*/ Math.floor(Math.random() * 100)}`);
          configPresetSelected?.children.push(newPreset);          
          setConfigPresetRoot(Object.create(configPresetRoot));
          setConfigPresetSelected(newPreset);
        }}
      >
        <PlusIcon/>
      </button>
      {rootConfig && <ConfigEntry config={rootConfig} configPresetSelected={configPresetSelected} setConfigPresetSelected={setConfigPresetSelected}/>}
      {/* {rootConfig ? rootConfig.children.map((config, index) => {
        return (<ConfigSelectButton
          label={config.name}
          active={index == configPresetSelected}
          setValue={(value) => {config.count = value; setDummyState(dummyState + 1)}}
          value={config.count}
          onClick={() => setConfigPresetSelected(index)}
          />)
      }) : <div/>} */}
    </div>
  )

};

const ConfigEntry = ({config, configPresetSelected, setConfigPresetSelected}: {config: ConfigPreset, configPresetSelected: ConfigPreset, setConfigPresetSelected: (selection: ConfigPreset) => void}) => {
  const [configCount, setConfigCount] = useState(config.count);
  return (
    <div>
      <ConfigSelectButton
      label={config.name}
      active={config == configPresetSelected}
      setValue={(value) => {setConfigCount(value);}}
      value={configCount}
      onClick={() => setConfigPresetSelected(config)}
      />
      <div className="ml-[20px]">
        {config.children.map(c =>
            (<ConfigEntry config={c} configPresetSelected={configPresetSelected} setConfigPresetSelected={setConfigPresetSelected}/>)
        )}
      </div>
    </div>
  );
}


const DeviceSetupEntry = ({device, selectedToFlash, toggleSelectedToFlash, progressText}
  :{device: Device, selectedToFlash: boolean, toggleSelectedToFlash: () => void, progressText: FlashState}) => {  
  // const [toBeFlashed, setToBeFlashed] = useState(device.selectedToFlash);

  

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
              variant={selectedToFlash && !progressText ? "default" : "outline"}
              size="sm"
              className="w-full gap-2 h-8"
              onClick={() => toggleSelectedToFlash()}
            >
              {stateToText(progressText)}
            </Button>
          </div>
          
        </div>
      </div>
    </li>
  );
}

function stateToText(state: FlashState) {
  switch(state.state) {
    case "doNotFlash":
      return "Disabled";
    case "doFlash":
      return "Enabled";
    case "connecting":
      return "Connecting...";
    case "erasing":
      return "Erasing...";
    case "flashing":
      return `Flashing... (${(state.progress * 100).toFixed(1)} %)`;    
    default:
      return state.state;
  }
}