import { produce } from "immer";
import { create } from "zustand";
import { Protobuf } from "@meshtastic/meshtasticjs";
import { OverallFlashingState } from "../flashing/Flasher";

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
    // TODO: Add remaining
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

  public static loadOrCreate(): ConfigPreset {
    const storedConfigs = localStorage.getItem("PresetConfigs");
    if(storedConfigs !== null) {
      const rootPreset = JSON.parse(storedConfigs, (key: string, value:  any) => {            
        if(key == '' || !isNaN(Number(key))) {
          // Create new ConfigPreset object to ensure that the member functions are not undefined.
          const preset = new ConfigPreset(value.name, undefined, value.config);
          preset.children = value.children;
          preset.children.forEach(c => c.parent = preset);
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
  overallFlashingState: OverallFlashingState;

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
  setOverallFlashingState: (state: OverallFlashingState) => void;
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
  overallFlashingState: "idle",

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
  setOverallFlashingState: (state: OverallFlashingState) => {    
    set(
      produce<AppState>((draft) => {
        draft.overallFlashingState = state;
      })
    )
  },
}));