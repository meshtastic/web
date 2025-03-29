import { produce } from "immer";
import { create } from "zustand";

export interface RasterSource {
  enabled: boolean;
  title: string;
  tiles: string;
  tileSize: number;
}

interface ErrorState {
  field: string;
  message: string;
}

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
  nodeNumToBeRemoved: number;
  connectDialogOpen: boolean;
  nodeNumDetails: number;
  errors: ErrorState[];

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
  connectDialogOpen: false,
  nodeNumToBeRemoved: 0,
  nodeNumDetails: 0,
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
  setNodeNumToBeRemoved: (nodeNum) =>
    set(() => ({
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
    set(() => ({
      nodeNumDetails: nodeNum,
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
