import { featureFlags } from "@core/services/featureFlags.ts";
import { createStorage } from "@core/stores/utils/indexDB.ts";
import { produce } from "immer";
import { create as createStore, type StateCreator } from "zustand";
import {
  type PersistOptions,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import type { RasterSource } from "./types.ts";

const IDB_KEY_NAME = "meshtastic-app-store";
const CURRENT_STORE_VERSION = 0;

type AppData = {
  // Persisted data
  rasterSources: RasterSource[];
};

export interface AppState extends AppData {
  // Ephemeral state (not persisted)
  selectedDeviceId: number;
  nodeNumToBeRemoved: number;
  connectDialogOpen: boolean;
  nodeNumDetails: number;
  commandPaletteOpen: boolean;

  setRasterSources: (sources: RasterSource[]) => void;
  addRasterSource: (source: RasterSource) => void;
  removeRasterSource: (index: number) => void;
  setSelectedDevice: (deviceId: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNodeNumToBeRemoved: (nodeNum: number) => void;
  setConnectDialogOpen: (open: boolean) => void;
  setNodeNumDetails: (nodeNum: number) => void;
}

export const deviceStoreInitializer: StateCreator<AppState> = (set, _get) => ({
  selectedDeviceId: 0,
  rasterSources: [],
  commandPaletteOpen: false,
  connectDialogOpen: false,
  nodeNumToBeRemoved: 0,
  nodeNumDetails: 0,

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
      selectedDeviceId: deviceId,
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
});

const persistOptions: PersistOptions<AppState, AppData> = {
  name: IDB_KEY_NAME,
  storage: createStorage<AppData>(),
  version: CURRENT_STORE_VERSION,
  partialize: (s): AppData => ({
    rasterSources: s.rasterSources,
  }),
  onRehydrateStorage: () => (state) => {
    if (!state) {
      return;
    }
    console.debug("AppStore: Rehydrating state", state);
  },
};

// Add persist middleware on the store if the feature flag is enabled
const persistApps = featureFlags.get("persistApp");
console.debug(
  `AppStore: Persisting app is ${persistApps ? "enabled" : "disabled"}`,
);

export const useAppStore = persistApps
  ? createStore(
      subscribeWithSelector(persist(deviceStoreInitializer, persistOptions)),
    )
  : createStore(subscribeWithSelector(deviceStoreInitializer));
