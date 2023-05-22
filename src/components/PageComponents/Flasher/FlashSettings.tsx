import { Button } from "@app/components/UI/Button";
import { type FlashState, setup, type OverallFlashingState, nextBatch, cancel, uploadCustomFirmware } from "@app/core/flashing/Flasher";
import { useToast } from "@app/core/hooks/useToast";
import { type ConfigPreset, useAppStore } from "@app/core/stores/appStore";
import { Device, useDeviceStore } from "@app/core/stores/deviceStore";
import { Label } from "../../UI/Label";
import { Switch } from "../../UI/Switch";
import { ArrowDownCircleIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { SelectItem, SelectSeparator, Select, SelectTrigger, SelectValue, SelectContent } from "../../UI/Select";
import { isStoredInDb } from "@app/core/flashing/FirmwareDb";

export const FlashSettings = ({deviceSelectedToFlash, setDeviceSelectedToFlash, totalConfigCount}:
    {deviceSelectedToFlash: FlashState[], setDeviceSelectedToFlash: React.Dispatch<React.SetStateAction<FlashState[]>>, totalConfigCount: number}) => {
  const [ fullFlash, setFullFlash ] = useState(false);
  const { overallFlashingState, setOverallFlashingState, selectedFirmware, selectedDeviceModel, firmwareList, setFirmwareList, configPresetRoot } = useAppStore();
  const firmware = firmwareList.find(f => f.id == selectedFirmware);
  const { toast } = useToast();
  const { getDevices } =  useDeviceStore();
  const devices = getDevices();
  const cancelButtonVisible = overallFlashingState.state != "idle";

  return (<div className="flex flex-col gap-1 rounded-md border border-dashed w-full border-slate-200 p-1 dark:border-slate-700">
    <div className="flex gap-3 w-full">
      <DeviceModelSelection/>
      <div className='flex w-full items-center gap-1' title="Fully reinstalls every device, even if they could simply be updated.">
        <Switch disabled={overallFlashingState.state == "busy"} checked={fullFlash} onCheckedChange={setFullFlash}/>
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
              await setup(configPresetRoot.getAll(), selectedDeviceModel, actualFirmware, fullFlash, (state: OverallFlashingState, progress?: number) => {
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
              deviceSelectedToFlash,
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

const FirmwareSelection = () => {
  const { firmwareRefreshing, setFirmwareRefreshing, firmwareList, setFirmwareList, selectedFirmware, setSelectedFirmware, overallFlashingState } = useAppStore();
  const isBusy = firmwareRefreshing || overallFlashingState.state == "busy";
  const { toast } = useToast();

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
        disabled={isBusy}
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
        disabled={isBusy}
        onClick={() => {
          setFirmwareRefreshing(true);
          loadFirmwareList().then((list) => {
            setFirmwareList(list.slice(0, 10));
            setFirmwareRefreshing(false);
          }).catch(() => toast({
            title: "❌ Could not download firmware version list."
          }));
        }}
      >
        <RefreshCwIcon size={20}/>
      </Button>
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

type DeviceModel = {
  displayName: string,
  name: string,
  vendorId: number,
  productId: number
}

// This is still missing some vendor and product IDs that could not be determined
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
  const { selectedDeviceModel, setSelectedDeviceModel, overallFlashingState } = useAppStore();

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
        disabled={overallFlashingState.state == "busy"}
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
