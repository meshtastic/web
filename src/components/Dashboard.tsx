import {
  useMemo,
  useState,
} from 'react';

import {
  ArrowDownCircleIcon,
  BluetoothIcon,
  DownloadIcon,
  Edit3Icon,
  ListPlusIcon,
  NetworkIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  UploadIcon,
  UsbIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react';

import {
  cancel,
  FlashState,
  nextBatch,
  OverallFlashingState,
  setup,
  uploadCustomFirmware,
} from '@app/core/flashing/Flasher';
import { useToast } from '@app/core/hooks/useToast';
import {
  ConfigPreset,
  useAppStore,
} from '@app/core/stores/appStore.js';
import {
  Device,
  useDeviceStore,
} from '@app/core/stores/deviceStore.js';
import { DeviceConfig } from '@app/pages/Config/DeviceConfig';
import { Button } from '@components/UI/Button.js';
import { Separator } from '@components/UI/Seperator.js';
import { H3 } from '@components/UI/Typography/H3.js';
import { Subtle } from '@components/UI/Typography/Subtle.js';

import { ConfigSelectButton } from './UI/ConfigSelectButton';
import { Label } from './UI/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './UI/Select';
import { Switch } from './UI/Switch';
import { ConfigList } from './PageComponents/Flasher/ConfigList';

export const Dashboard = () => {
  let { configPresetRoot, configPresetSelected } : {configPresetRoot: ConfigPreset, configPresetSelected?: ConfigPreset} = useAppStore();
  const getTotalConfigCount = (c: ConfigPreset): number => c.children.map(child => getTotalConfigCount(child)).reduce((prev, cur) => prev + cur, c.count);  
  const [ totalConfigCount, setTotalConfigCount ] = useState(configPresetRoot.getTotalConfigCount());    

  return (
    <div className="flex flex-col h-full gap-3 p-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <H3>Connected Devices</H3>
          <Subtle>Manage, connect and disconnect devices</Subtle>
        </div>
      </div>

      <Separator />

      <div className="flex w-full h-full gap-3 overflow-auto">
        <DeviceList rootConfig={configPresetRoot} totalConfigCount={totalConfigCount}/>
        <ConfigList rootConfig={configPresetRoot} setTotalConfigCountDiff={(diff) => setTotalConfigCount(totalConfigCount + diff)}/>
        <div className="flex h-full overflow-auto w-full relative"><DeviceConfig key={configPresetSelected?.name}/></div>
      </div>
    </div>
  );
};

const DeviceList = ({rootConfig, totalConfigCount}: {rootConfig: ConfigPreset, totalConfigCount: number}) => {  
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

const FlashSettings = ({deviceSelectedToFlash, setDeviceSelectedToFlash, totalConfigCount, rootConfig, devices}:
  {deviceSelectedToFlash: FlashState[], setDeviceSelectedToFlash: React.Dispatch<React.SetStateAction<FlashState[]>>, totalConfigCount: number, rootConfig: ConfigPreset, devices: Device[]}) => {
  const [ fullFlash, setFullFlash ] = useState(false);
  const { overallFlashingState, setOverallFlashingState, selectedFirmware, selectedDeviceModel, firmwareList, setFirmwareList } = useAppStore();
  const firmware = firmwareList.find(f => f.id == selectedFirmware);
  const { toast } = useToast();
  const cancelButtonVisible = overallFlashingState.state != "idle";  

  return (<div className="flex flex-col gap-3">
    <div className="flex gap-3 w-full">
      <DeviceModelSelection/>
      <div className='flex w-full items-center gap-3' title="Fully reinstalls every device, even if they could simply be updated.">
        <Switch checked={fullFlash} onCheckedChange={setFullFlash}/>
        <Label>Force full wipe and reinstall</Label>
      </div>
    </div>            
    <div className="flex gap-3">
      <FirmwareSelection/>
      <div className="flex w-full">
        {deviceSelectedToFlash.filter(d => d).length > 0 && <Button
          className="gap-2 w-full"
          disabled={totalConfigCount == 0 || overallFlashingState.state == "busy"}
          onClick={async () => {
            // rootConfig.children[0].getFinalConfig(); // FIXME
            if(overallFlashingState.state == "idle") {
              setOverallFlashingState({ state: "busy" });
              let actualFirmware = firmware;                      
              if(actualFirmware === undefined) {
                const list = await loadFirmwareList();
                setFirmwareList(list.slice(0, 10));
                if(list.length == 0)
                  throw "Failed";
                actualFirmware = list.filter(l => !l.isPreRelease)[0];
              }
              await setup(rootConfig.getAll(), selectedDeviceModel, actualFirmware, fullFlash, (state: OverallFlashingState, progress?: number) => {
                if(state == 'busy') {
                  isStoredInDb(actualFirmware!.tag).then(b => {
                    // All FirmwareVersion objects are immutable here so we'll have to re-create each entry
                    const newFirmwareList: FirmwareVersion[] = firmwareList.map(f => { return {
                      name: f.name,
                      tag: f.tag,
                      id: f.id,
                      isPreRelease: f.isPreRelease,
                      inLocalDb: f == actualFirmware ? b : f.inLocalDb 
                    }});
                    setFirmwareList(newFirmwareList);
                  });
                }
                  
                setOverallFlashingState({state, progress});
              });
            }
            nextBatch(devices,
              deviceSelectedToFlash,    /* EXTREMELY HACKY -- FIX THIS */
              (f)=> {
                f.device.setFlashState(f.state);
                deviceSelectedToFlash[devices.indexOf(f.device)] = f.state;
                setDeviceSelectedToFlash(deviceSelectedToFlash);           

                if(f.state.state == "failed") {                              
                  toast({ title: `❌ Error: ${f.errorReason}`});                          
                }
              }
            );
          }}
        >            
          {stateToText(overallFlashingState.state, overallFlashingState.progress)}
        </Button>}
      </div>
      {cancelButtonVisible && <Button
        className="ml-1 p-2"
        variant={"destructive"}
        onClick={() => {
          if(!confirm("Cancel flashing?"))
            return;
          cancel();
        }}
      >
        <XIcon/>
      </Button>}
    </div>
  </div>
  )
};



const DeviceSetupEntry = ({device, selectedToFlash, toggleSelectedToFlash, progressText}
  :{device: Device, selectedToFlash: boolean, toggleSelectedToFlash: () => void, progressText: FlashState}) => {  
  // const [toBeFlashed, setToBeFlashed] = useState(device.selectedToFlash);

  

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

const FirmwareSelection = () => {  
  const { firmwareRefreshing, setFirmwareRefreshing, firmwareList, setFirmwareList, selectedFirmware, setSelectedFirmware } = useAppStore();  

  let selectItems = [
    <SelectItem key={-1} value={"latest"}>
      {"Latest stable version"}
    </SelectItem>,
    <SelectSeparator/>
  ];
  let selection = selectedFirmware;  
  if(firmwareRefreshing) {
    selectItems = [
      <SelectItem key={0} value={"updating"}>
        {"Updating firmware list..."}
      </SelectItem>
    ];
    selection = "updating";
  }
  else if(firmwareList.length == 0) {
    selectItems.push(
      <SelectItem key={0} value={"hint"} disabled={true}>
        {"(Press update button to get version list)"}
      </SelectItem>
    );
  }
  else {
    const versions = firmwareList.map((f, index) => (      
      <SelectItem key={index} value={f.id}>
        {f.isPreRelease ?
        (<div className="flex gap-2 items-center">{`(${f.name})`} {f.inLocalDb ? [<ArrowDownCircleIcon size={20}/>] : []}</div>) :
        (<div className="flex gap-2 items-center">{f.name} {f.inLocalDb ? [<ArrowDownCircleIcon size={20}/>] : []}</div>)
        }
      </SelectItem>
    ))
    selectItems.push(...versions);
  }  
  selectItems.push(
    <SelectItem  key={100} value={"custom"}>
      {"< Load custom firmware >"}
    </SelectItem>
  );

  return (
    <div className="flex gap-1 w-full">
      <Select   
        disabled={firmwareRefreshing}        
        onValueChange={async (v) => {
          if(v == "custom") {            
            const desc = await uploadCustomFirmware();
            if(desc === undefined)
              return;
            if(!firmwareList.find(f => f.id == desc.id)) {
              const newFirmwareList: FirmwareVersion[] = firmwareList.map(f => f).concat([ desc ]);
              setFirmwareList(newFirmwareList);
            }            
            setSelectedFirmware(desc.id);
          }
          else {
            setSelectedFirmware(v);
          }          
        }}
        value={selection}                // << Value of selected item
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {selectItems}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        className="ml-1 p-2"
        title="Update firmware version list"
        disabled={firmwareRefreshing}
        onClick={() => {
          setFirmwareRefreshing(true);
          loadFirmwareList().then((list) => { 
            setFirmwareList(list.slice(0, 10));
            setFirmwareRefreshing(false);            
            // TODO: What if download fails?
          });
        }}
      >
        <RefreshCwIcon size={20}/>
      </Button>
    </div>
    
  );
}

type DeviceModel = {
  displayName: string,
  name: string,
  vendorId: number,
  productId: number
}

// TODO: Fill in remaining vendor and product IDs
export const deviceModels: DeviceModel[] = [
  {
    displayName: "Heltec v1",
    name: "heltec-v1",
    vendorId: -1,
    productId: -1
  },
  {
    displayName: "Heltec v2.0",
    name: "heltec-v2.0",
    vendorId: -1,
    productId: -1
  },
  {
    displayName: "Heltec v2.1",
    name: "heltec-v2.1",
    vendorId: -1,
    productId: -1
  },
  {
    displayName: "T-Beam v0.7",
    name: "tbeam0.7",
    vendorId: -1,
    productId: -1
  },
  {
    displayName: "T-Beam",
    name: "tbeam",
    vendorId: -1,
    productId: -1
  },
  {
    displayName: "T-Lora v1",
    name: "tlora-v1",
    vendorId: -1,
    productId: -1
  },
  {
    displayName: "T-Lora v1.3",
    name: "tlora-v1_3",
    vendorId: -1,
    productId: -1
  },
  {
    displayName: "T-Lora v2",
    name: "tlora-v2",
    vendorId: -1,
    productId: -1
  },
  {
    displayName: "T-Lora v2.1-1.6",
    name: "tlora-v2-1-1.6",
    vendorId: 6790,
    productId: 21972
  },
]

const DeviceModelSelection = () => {  
  const { selectedDeviceModel, setSelectedDeviceModel } = useAppStore();
  
  let selectItems = [
    <SelectItem key={"auto"} value={"auto"}>
      {"Auto-detect device model"}
    </SelectItem>,
    <SelectSeparator/>
  ];
  selectItems.push(...deviceModels.map(d =>
    <SelectItem key={d.name} value={d.name}>
      {d.displayName}
    </SelectItem>
  ));


  return (
    <div className="flex gap-1 w-full">
      <Select        
        onValueChange={setSelectedDeviceModel}            
        value={selectedDeviceModel}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {selectItems}
        </SelectContent>
      </Select>
    </div>
    
  );
}

export type FirmwareVersion = {
  name: string,
  tag: string,
  id: string,
  inLocalDb: boolean,
  isPreRelease: boolean
}

interface FirmwareGithubRelease {
  name: string,
  tag_name: string,  
  prerelease: boolean,
  assets: {
    name: string,
    id: string
  }[]
}

// TODO: Move this somewhere better
export async function isStoredInDb(firmwareTag: string): Promise<boolean> {
    const dbs = await indexedDB.databases();
    if(dbs.find(db => db.name == "firmwares") === undefined)
        return false;
    return new Promise<boolean>((resolve, reject) => {        
        const db = indexedDB.open("firmwares");
        db.onsuccess = () => {
            if(!db.result.objectStoreNames.contains("files"))
                resolve(false);
            const objStore = db.result.transaction("files", "readonly").objectStore("files");
            const transaction = objStore.getKey(firmwareTag);
            transaction.onsuccess = () => resolve(transaction.result !== undefined);                
            transaction.onerror = () => resolve(false);     
        }
    });
}

async function loadFirmwareList() : Promise<FirmwareVersion[]> {
  const releases: FirmwareGithubRelease[] = await (await fetch("https://api.github.com/repos/meshtastic/firmware/releases")).json();
  console.log(releases);
  const firmwareDescriptions = await Promise.all(releases.map(async (r) => {
    const id = r.assets.find(a => a.name.startsWith("firmware"))!.id;
    if(id === undefined)
      return undefined;
    const tag = r.tag_name.substring(1);      // remove leading "v"    
    return { 
      name: r.name.replace("Meshtastic Firmware ", ""),
      tag: tag,
      id: id,
      isPreRelease: r.prerelease,
      inLocalDb: await isStoredInDb(tag)
    };
  }));  
  return firmwareDescriptions.filter(r => r !== undefined) as FirmwareVersion[];
 
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

function stateToText(state: OverallFlashingState, progress?: number) {
  switch(state) {
    case "idle":
      return "Flash";
    case "downloading":
      return progress ? `Downloading firmware... (${(progress * 100).toFixed(1)} %)` : "Downloading firmware...";
    case "busy":
      return "In Progress...";    
    case "waiting":
      return "Continue";
    default:
      state;
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

