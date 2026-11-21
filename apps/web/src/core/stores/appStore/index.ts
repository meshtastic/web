import {
  DEFAULT_NODE_LIST_SORTS,
  type NodeListId,
  type NodeListSorts,
  parseNodeListSorts,
} from "@core/nodes/nodeSort.ts";
import { featureFlags } from "@core/services/featureFlags.ts";
import { createStorage } from "@core/stores/utils/indexDB.ts";
import { produce } from "immer";
import { create as createStore, type StateCreator } from "zustand";
import {
  type PersistOptions,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import type {
  ConnectionsDrawerState,
  ConnectionsView,
  RasterSource,
} from "./types.ts";

const IDB_KEY_NAME = "meshtastic-app-store";
/**
 * 0: rasterSources only.
 * 1: adds nodeListSorts, the sort each node list keeps.
 */
export const CURRENT_STORE_VERSION = 1;

export type AppData = {
  // Persisted data
  rasterSources: RasterSource[];
  /** Each node list's sort; always persisted, unlike the raster sources. */
  nodeListSorts: NodeListSorts;
};

export interface AppState extends AppData {
  // Ephemeral state (not persisted)
  selectedDeviceId: number;
  nodeNumToBeRemoved: number;
  connectionsDrawer: ConnectionsDrawerState;
  nodeNumDetails: number;
  commandPaletteOpen: boolean;

  setRasterSources: (sources: RasterSource[]) => void;
  addRasterSource: (source: RasterSource) => void;
  removeRasterSource: (index: number) => void;
  setSelectedDevice: (deviceId: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNodeNumToBeRemoved: (nodeNum: number) => void;
  openConnections: (view?: ConnectionsView) => void;
  closeConnections: () => void;
  setConnectionsView: (view: ConnectionsView) => void;
  setNodeNumDetails: (nodeNum: number) => void;
  setNodeListSort: <L extends NodeListId>(
    list: L,
    sort: NodeListSorts[L],
  ) => void;
}

export const deviceStoreInitializer: StateCreator<AppState> = (set, _get) => ({
  selectedDeviceId: 0,
  rasterSources: [],
  nodeListSorts: DEFAULT_NODE_LIST_SORTS,
  commandPaletteOpen: false,
  connectionsDrawer: { open: false, view: "list" },
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
  // Block bodies: under persist, `set` returns the storage write's promise,
  // and a returned promise would make React's act() treat the call as async.
  setSelectedDevice: (deviceId) => {
    set(() => ({ selectedDeviceId: deviceId }));
  },
  setCommandPaletteOpen: (open: boolean) => {
    set(
      produce<AppState>((draft) => {
        draft.commandPaletteOpen = open;
      }),
    );
  },
  setNodeNumToBeRemoved: (nodeNum) => {
    set(() => ({ nodeNumToBeRemoved: nodeNum }));
  },
  openConnections: (view = "list") => {
    set(() => ({ connectionsDrawer: { open: true, view } }));
  },
  closeConnections: () => {
    set(() => ({ connectionsDrawer: { open: false, view: "list" } }));
  },
  setConnectionsView: (view) => {
    set((state) => ({
      connectionsDrawer: { ...state.connectionsDrawer, view },
    }));
  },
  setNodeNumDetails: (nodeNum) => {
    set(() => ({ nodeNumDetails: nodeNum }));
  },
  setNodeListSort: (list, sort) => {
    set((state) => ({
      nodeListSorts: { ...state.nodeListSorts, [list]: sort },
    }));
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRasterSource = (value: unknown): value is RasterSource =>
  isRecord(value) &&
  typeof value.enabled === "boolean" &&
  typeof value.title === "string" &&
  typeof value.tiles === "string" &&
  typeof value.tileSize === "number";

/** Raster sources as stored; malformed entries are dropped. */
const parseRasterSources = (
  value: unknown,
  fallback: RasterSource[],
): RasterSource[] =>
  Array.isArray(value) ? value.filter(isRasterSource) : fallback;

/**
 * Persisted state from an older version brought up to date. Version 0 had
 * no list sorts, so they start at their defaults; the raster sources carry
 * over.
 */
export const migrateAppData = (
  persisted: unknown,
  version: number,
): Partial<AppData> => {
  if (!isRecord(persisted)) {
    return {};
  }
  return {
    nodeListSorts:
      version < 1
        ? DEFAULT_NODE_LIST_SORTS
        : parseNodeListSorts(persisted.nodeListSorts),
    ...(Array.isArray(persisted.rasterSources)
      ? { rasterSources: parseRasterSources(persisted.rasterSources, []) }
      : {}),
  };
};

/**
 * Merges stored data into the store, validating it: each list's sort falls
 * back to its default on its own, and raster sources load only while
 * `persistApp` is on.
 */
const mergeAppData =
  (withRasterSources: boolean) =>
  (persisted: unknown, current: AppState): AppState => {
    if (!isRecord(persisted)) {
      return current;
    }
    return {
      ...current,
      nodeListSorts: parseNodeListSorts(persisted.nodeListSorts),
      ...(withRasterSources
        ? {
            rasterSources: parseRasterSources(
              persisted.rasterSources,
              current.rasterSources,
            ),
          }
        : {}),
    };
  };

// Raster sources persist only with the feature flag; list sorts always do.
const persistApps = featureFlags.get("persistApp");
console.debug(
  `AppStore: Persisting app is ${persistApps ? "enabled" : "disabled"}`,
);

const persistOptions: PersistOptions<AppState, Partial<AppData>> = {
  name: IDB_KEY_NAME,
  storage: createStorage<Partial<AppData>>(),
  version: CURRENT_STORE_VERSION,
  partialize: (s): Partial<AppData> =>
    persistApps
      ? { rasterSources: s.rasterSources, nodeListSorts: s.nodeListSorts }
      : { nodeListSorts: s.nodeListSorts },
  migrate: migrateAppData,
  merge: mergeAppData(persistApps),
  onRehydrateStorage: () => (state) => {
    if (!state) {
      return;
    }
    console.debug("AppStore: Rehydrating state", state);
  },
};

export const useAppStore = createStore(
  subscribeWithSelector(persist(deviceStoreInitializer, persistOptions)),
);
