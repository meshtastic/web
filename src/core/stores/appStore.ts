import { Types } from "@meshtastic/js";
import { produce } from "immer";
import { create } from "zustand";

export interface RasterSource {
  enabled: boolean;
  title: string;
  tiles: string;
  tileSize: number;
}

interface AppState {
  selectedDevice: number;
  devices: {
    id: number;
    num: number;
  }[];
  rasterSources: RasterSource[];
  commandPaletteOpen: boolean;
  nodeNumToBeRemoved: number;
  connectDialogOpen: boolean;
  nodeNumDetails: number;
  activeChat: number;
  chatType: "broadcast" | "direct";

  setRasterSources: (sources: RasterSource[]) => void;
  addRasterSource: (source: RasterSource) => void;
  removeRasterSource: (index: number) => void;

  setSelectedDevice: (deviceId: number) => void;
  addDevice: (device: { id: number; num: number }) => void;
  removeDevice: (deviceId: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNodeNumToBeRemoved: (nodeNum: number) => void;
  setConnectDialogOpen: (open: boolean) => void;
  setNodeNumDetails: (nodeNum: number) => void;
  setActiveChat: (chat: number) => void;
  setChatType: (type: "broadcast" | "direct") => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedDevice: 0,
  devices: [],
  currentPage: "messages",
  rasterSources: [],
  commandPaletteOpen: false,
  connectDialogOpen: false,
  nodeNumToBeRemoved: 0,
  nodeNumDetails: 0,
  activeChat: Types.ChannelNumber.Primary,
  chatType: "broadcast",

  setRasterSources: (sources: RasterSource[]) => {
    set(
      produce<AppState>((draft) => {
        draft.rasterSources = sources;
      }),
    );
  },
  addRasterSource: (source: RasterSource) => {
    set(
      produce<AppState>((draft) => {
        draft.rasterSources.push(source);
      }),
    );
  },
  removeRasterSource: (index: number) => {
    set(
      produce<AppState>((draft) => {
        draft.rasterSources.splice(index, 1);
      }),
    );
  },
  setSelectedDevice: (deviceId) =>
    set(() => ({
      selectedDevice: deviceId,
    })),
  addDevice: (device) =>
    set((state) => ({
      devices: [...state.devices, device],
    })),
  removeDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.filter((device) => device.id !== deviceId),
    })),
  setCommandPaletteOpen: (open: boolean) => {
    set(
      produce<AppState>((draft) => {
        draft.commandPaletteOpen = open;
      }),
    );
  },
  setNodeNumToBeRemoved: (nodeNum) =>
    set((state) => ({
      nodeNumToBeRemoved: nodeNum,
    })),
  setConnectDialogOpen: (open: boolean) => {
    set(
      produce<AppState>((draft) => {
        draft.connectDialogOpen = open;
      }),
    );
  },

  setNodeNumDetails: (nodeNum) =>
    set((state) => ({
      nodeNumDetails: nodeNum,
    })),
  setActiveChat: (chat) =>
    set(() => ({
      activeChat: chat,
    })),
  setChatType: (type) =>
    set(() => ({
      chatType: type,
    })),
}));
