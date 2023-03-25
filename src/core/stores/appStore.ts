import { produce } from 'immer';
import { create } from 'zustand';

import { FirmwareVersion } from '@app/components/Dashboard';
import { Protobuf } from '@meshtastic/meshtasticjs';

import type { OverallFlashingState } from '../flashing/Flasher';

export interface RasterSource {
  enabled: boolean;
  title: string;
  tiles: string;
  tileSize: number;
}

export type accentColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

export class ConfigPreset {
  public children: ConfigPreset[] = [];  
  public count: number = 0;
  public overrideValues: {[fieldName: string]: boolean};

  public constructor(public name: string, public parent?: ConfigPreset, public config : Protobuf.LocalConfig = new Protobuf.LocalConfig()) {
    if(parent) {
      // Root config should not be overridable
      this.overrideValues = {};
    }
    if(config.device === undefined)
      config.device = new Protobuf.Config_DeviceConfig();
    if(config.position === undefined)
      config.position = new Protobuf.Config_PositionConfig();
    if(config.power === undefined)
      config.power = new Protobuf.Config_PowerConfig();
    if(config.network === undefined)
      config.network = new Protobuf.Config_NetworkConfig();
    if(config.display === undefined)
      config.display = new Protobuf.Config_DisplayConfig();
    if(config.lora === undefined)
      config.lora = new Protobuf.Config_LoRaConfig();
    if(config.bluetooth === undefined)
      config.bluetooth = new Protobuf.Config_BluetoothConfig();
  }

  public saveConfigTree() {
    localStorage.setItem("PresetConfigs", this.getConfigTreeJSON());
  }

  public exportConfigTree() {
    const blob = new Blob([this.getConfigTreeJSON()], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const elem = document.createElement("a");
    elem.setAttribute("href", url);
    elem.setAttribute("download", "ConfigPresets.json");
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
    URL.revokeObjectURL(url);
  }

  public getTotalConfigCount(): number {
    return this.children.map(child => child.getTotalConfigCount()).reduce((prev, cur) => prev + cur, this.count);
  }

  public getAll(): ConfigPreset[] {
    const configs: ConfigPreset[] = [ this ];
    this.children.forEach(c => 
      configs.push(...c.getAll())
    );
    return configs;
  }

  private getConfigTreeJSON(): string {
    if(this.parent) {
      return this.parent.getConfigTreeJSON();      
    }
    const replacer = (key: string, value: any) => {
      if(key == "parent" || key == "count")
        return undefined;
      return value;
    }
    return JSON.stringify(this, replacer);
  }

  public getFinalConfig(): Protobuf.LocalConfig {    
    const config = new Protobuf.LocalConfig();
    config.device = new Protobuf.Config_DeviceConfig();
    config.position = new Protobuf.Config_PositionConfig();
    config.power = new Protobuf.Config_PowerConfig();
    config.network = new Protobuf.Config_NetworkConfig();
    config.display = new Protobuf.Config_DisplayConfig();    
    Object.entries(config).forEach(([sectionKey, value]) => {
      if(sectionKey == "version")
        return;
      Object.keys(value).forEach(key => {        
        (value as any)[key] = this.getConfigValue(sectionKey as keyof Protobuf.LocalConfig, key);
      })
    });    
    return config;
  }

  private getConfigValue(sectionKey: keyof Protobuf.LocalConfig, key: string): any {
    if(this.parent !== undefined && !this.overrideValues[key])
      return this.parent.getConfigValue(sectionKey, key);
    const conf = this.config[sectionKey];
    
    // TODO: any???
    return (conf as any)[key];
  }

  public static loadOrCreate(): ConfigPreset {
    const storedConfigs = localStorage.getItem("PresetConfigs");
    if(storedConfigs !== null) {
      const rootPreset = JSON.parse(storedConfigs, (key: string, value:  any) => {            
        if(key == '' || !isNaN(Number(key))) {
          // Create new ConfigPreset object to ensure that the member functions are not undefined.
          const preset = new ConfigPreset(value.name, undefined, value.config);
          preset.overrideValues = value.overrideValues;
          preset.children = value.children;
          preset.children.forEach(c => {
            c.parent = preset;
            c.overrideValues = {};
          });
          return preset;
        }
        return value;
      });
      return rootPreset;
    }
    return new ConfigPreset("Root");
  }

  public static importConfigTree() {
    
  }  

  public restoreChildConnections() {
    this.children.forEach((c) => {
      c.parent = this;  
      c.restoreChildConnections();
    });
  }

}

function loadFirmwareListFromStorage(): FirmwareVersion[] {
  const list = localStorage.getItem("firmwareList") as (string | undefined);
  if(list === undefined)
    return [];
  try {
    const json = JSON.parse(list) as FirmwareVersion[];
    if(json.every(o => "name" in o && "inLocalDb" in o && "id" in o && "tag" in o))
      return json;    
    else
      return [];
  }
  catch {
    return [];
  }
}

interface AppState {
  selectedDevice: number;
  devices: {
    id: number;
    num: number;
  }[];
  rasterSources: RasterSource[];
  commandPaletteOpen: boolean;
  darkMode: boolean;
  accent: accentColor;
  connectDialogOpen: boolean;
  configPresetRoot: ConfigPreset;
  configPresetSelected: ConfigPreset | undefined;
  overallFlashingState: {
    state: OverallFlashingState,
    progress?: number
  },
  firmwareRefreshing: boolean;
  firmwareList: FirmwareVersion[];
  selectedFirmware: string;

  setRasterSources: (sources: RasterSource[]) => void;
  addRasterSource: (source: RasterSource) => void;
  removeRasterSource: (index: number) => void;

  setSelectedDevice: (deviceId: number) => void;
  addDevice: (device: { id: number; num: number }) => void;
  removeDevice: (deviceId: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
  setAccent: (color: accentColor) => void;
  setConnectDialogOpen: (open: boolean) => void;
  setConfigPresetRoot: (root: ConfigPreset) => void;
  setConfigPresetSelected: (selection: ConfigPreset) => void;
  setOverallFlashingState: (state: { state: OverallFlashingState, progress?: number }) => void;
  setFirmwareRefreshing: (state: boolean) => void;
  setFirmwareList: (state: FirmwareVersion[]) => void;
  setSelectedFirmware: (state: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedDevice: 0,
  devices: [],
  currentPage: "messages",
  rasterSources: [],
  commandPaletteOpen: false,
  darkMode: true,     // TEMP: Default to dark mode
  accent: "orange",
  connectDialogOpen: false,
  configPresetRoot: ConfigPreset.loadOrCreate(),
  configPresetSelected: undefined,
  overallFlashingState: { state: "idle" },
  firmwareDownloadProgress: undefined,
  firmwareRefreshing: false,
  firmwareList: loadFirmwareListFromStorage(),
  selectedFirmware: "latest",

  setRasterSources: (sources: RasterSource[]) => {
    set(
      produce<AppState>((draft) => {
        draft.rasterSources = sources;
      })
    );
  },
  addRasterSource: (source: RasterSource) => {
    set(
      produce<AppState>((draft) => {
        draft.rasterSources.push(source);
      })
    );
  },
  removeRasterSource: (index: number) => {
    set(
      produce<AppState>((draft) => {
        draft.rasterSources.splice(index, 1);
      })
    );
  },
  setSelectedDevice: (deviceId) =>
    set(() => ({
      selectedDevice: deviceId
    })),
  addDevice: (device) =>
    set((state) => ({
      devices: [...state.devices, device]
    })),
  removeDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.filter((device) => device.id !== deviceId)
    })),
  setCommandPaletteOpen: (open: boolean) => {
    set(
      produce<AppState>((draft) => {
        draft.commandPaletteOpen = open;
      })
    );
  },
  setDarkMode: (enabled: boolean) => {
    set(
      produce<AppState>((draft) => {
        draft.darkMode = enabled;
      })
    );
  },
  setAccent(color) {
    set(
      produce<AppState>((draft) => {
        draft.accent = color;
      })
    );
  },
  setConnectDialogOpen: (open: boolean) => {
    set(
      produce<AppState>((draft) => {
        draft.connectDialogOpen = open;
      })
    );
  },
  setConfigPresetRoot: (root: ConfigPreset) => {
    set(
      produce<AppState>((draft) => {
        draft.configPresetRoot = root;
      })
    )
  },
  setConfigPresetSelected: (selection: ConfigPreset) => {
    console.log(`${selection.name} has been selected.`);
    set(
      produce<AppState>((draft) => {
        draft.configPresetSelected = selection;
      })
    )
  },
  setOverallFlashingState: (state: { state: OverallFlashingState, progress?: number }) => {    
    set(
      produce<AppState>((draft) => {
        draft.overallFlashingState = state;
      })
    )
  },
  setFirmwareRefreshing: (state: boolean) => {
    set(
      produce<AppState>((draft) => {
        draft.firmwareRefreshing = state;
      })
    )
  },
  setFirmwareList: (state: FirmwareVersion[]) => {
    set(
      produce<AppState>((draft) => {
        localStorage.setItem("firmwareList", JSON.stringify(state));
        draft.firmwareList = state;
      })
    )
  },
  setSelectedFirmware: (state: string) => {
    set(
      produce<AppState>((draft) => {
        draft.selectedFirmware = state;
      })
    )
  },
}));