import { produce } from "immer";
import { create } from "zustand";
import { Protobuf } from "@meshtastic/meshtasticjs";

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
  configPresetSelected: number;

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
  setConfigPresetSelected: (selection: number) => void;
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
  configPresetRoot: undefined,
  configPresetSelected: 0,

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
  setConfigPresetSelected: (selection: number) => {
    set(
      produce<AppState>((draft) => {
        draft.configPresetSelected = selection;
      })
    )
  }
}));

export class ConfigPreset {
  public children: ConfigPreset[] = [];
  public count: number = 0;

  public constructor(public name: string, public config : Protobuf.Config) { }
}