import { Types } from "@meshtastic/js";
import { produce } from "immer";
import { create } from "zustand";

export interface RasterSource {
  enabled: boolean;
  title: string;
  tiles: string;
  tileSize: number;
}

export type AccentColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

interface ErrorState {
  field: string;
  message: string;
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
  nodeNumToBeRemoved: number;
  accent: AccentColor;
  connectDialogOpen: boolean;
  nodeNumDetails: number;
  activeChat: number;
  chatType: "broadcast" | "direct";
  errors: ErrorState[];

  setRasterSources: (sources: RasterSource[]) => void;
  addRasterSource: (source: RasterSource) => void;
  removeRasterSource: (index: number) => void;
  setSelectedDevice: (deviceId: number) => void;
  addDevice: (device: { id: number; num: number }) => void;
  removeDevice: (deviceId: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
  setNodeNumToBeRemoved: (nodeNum: number) => void;
  setAccent: (color: AccentColor) => void;
  setConnectDialogOpen: (open: boolean) => void;
  setNodeNumDetails: (nodeNum: number) => void;
  setActiveChat: (chat: number) => void;
  setChatType: (type: "broadcast" | "direct") => void;

  // Error management
  hasErrors: () => boolean;
  getErrorMessage: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
  addError: (field: string, message: string) => void;
  removeError: (field: string) => void;
  clearErrors: () => void;
  setNewErrors: (newErrors: ErrorState[]) => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  selectedDevice: 0,
  devices: [],
  currentPage: "messages",
  rasterSources: [],
  commandPaletteOpen: false,
  darkMode:
    localStorage.getItem("theme-dark") !== null
      ? localStorage.getItem("theme-dark") === "true"
      : window.matchMedia("(prefers-color-scheme: dark)").matches,
  accent: "orange",
  connectDialogOpen: false,
  nodeNumToBeRemoved: 0,
  nodeNumDetails: 0,
  activeChat: Types.ChannelNumber.Primary,
  chatType: "broadcast",
  errors: [],

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
  setDarkMode: (enabled: boolean) => {
    localStorage.setItem("theme-dark", enabled.toString());
    set(
      produce<AppState>((draft) => {
        draft.darkMode = enabled;
      }),
    );
  },
  setNodeNumToBeRemoved: (nodeNum) =>
    set((state) => ({
      nodeNumToBeRemoved: nodeNum,
    })),
  setAccent(color) {
    set(
      produce<AppState>((draft) => {
        draft.accent = color;
      }),
    );
  },
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
  hasErrors: () => {
    const state = get();
    return state.errors.length > 0;
  },
  getErrorMessage: (field: string) => {
    const state = get();
    return state.errors.find((err) => err.field === field)?.message;
  },
  hasFieldError: (field: string) => {
    const state = get();
    return state.errors.some((err) => err.field === field);
  },
  addError: (field: string, message: string) => {
    set(
      produce<AppState>((draft) => {
        draft.errors = [
          ...draft.errors.filter((e) => e.field !== field),
          { field, message },
        ];
      }),
    );
  },
  removeError: (field: string) => {
    set(
      produce<AppState>((draft) => {
        draft.errors = draft.errors.filter((e) => e.field !== field);
      }),
    );
  },
  clearErrors: () => {
    set(
      produce<AppState>((draft) => {
        draft.errors = [];
      }),
    );
  },
  setNewErrors: (newErrors: ErrorState[]) => {
    set(
      produce<AppState>((draft) => {
        draft.errors = newErrors;
      }),
    );
  },
}));
