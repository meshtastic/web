import {
  DEFAULT_NODE_LIST_SORTS,
  type NodeListId,
  type NodeListSorts,
  parseNodeListSorts,
} from "@core/nodes/nodeSort.ts";
import { parseSkinToneIndex } from "@core/emoji/catalog.ts";
import {
  type EmojiFrequency,
  parseEmojiFrequency,
  recordEmojiUse,
} from "@core/emoji/frequency.ts";
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
 * 2: adds emojiFrequency and skinToneIndex, the emoji picker's memory.
 */
export const CURRENT_STORE_VERSION = 2;

export type AppData = {
  // Persisted data
  rasterSources: RasterSource[];
  /** Each node list's sort; always persisted, unlike the raster sources. */
  nodeListSorts: NodeListSorts;
  /** Emoji picked from the picker and how often, for the quick rows. */
  emojiFrequency: EmojiFrequency;
  /** Preferred skin tone, 0 (default) to 5 (dark). */
  skinToneIndex: number;
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
  recordEmojiUse: (emoji: string) => void;
  setSkinToneIndex: (index: number) => void;
}

export const deviceStoreInitializer: StateCreator<AppState> = (set, _get) => ({
  selectedDeviceId: 0,
  rasterSources: [],
  nodeListSorts: DEFAULT_NODE_LIST_SORTS,
  emojiFrequency: [],
  skinToneIndex: 0,
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
  recordEmojiUse: (emoji) => {
    set((state) => ({
      emojiFrequency: recordEmojiUse(state.emojiFrequency, emoji),
    }));
  },
  setSkinToneIndex: (index) => {
    set(() => ({ skinToneIndex: parseSkinToneIndex(index) }));
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
 * over. Before version 2 there was no emoji memory: no uses, default tone.
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
    emojiFrequency:
      version < 2 ? [] : parseEmojiFrequency(persisted.emojiFrequency),
    skinToneIndex:
      version < 2 ? 0 : parseSkinToneIndex(persisted.skinToneIndex),
    ...(Array.isArray(persisted.rasterSources)
      ? { rasterSources: parseRasterSources(persisted.rasterSources, []) }
      : {}),
  };
};

/**
 * Merges stored data into the store, validating it: each list's sort falls
 * back to its default on its own, malformed emoji uses are dropped, and
 * raster sources load only while
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
      emojiFrequency: parseEmojiFrequency(persisted.emojiFrequency),
      skinToneIndex: parseSkinToneIndex(persisted.skinToneIndex),
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

// Raster sources persist only with the feature flag; list sorts and the
// emoji memory always do.
const persistApps = featureFlags.get("persistApp");
console.debug(
  `AppStore: Persisting app is ${persistApps ? "enabled" : "disabled"}`,
);

const persistOptions: PersistOptions<AppState, Partial<AppData>> = {
  name: IDB_KEY_NAME,
  storage: createStorage<Partial<AppData>>(),
  version: CURRENT_STORE_VERSION,
  partialize: (s): Partial<AppData> => ({
    ...(persistApps ? { rasterSources: s.rasterSources } : {}),
    nodeListSorts: s.nodeListSorts,
    emojiFrequency: s.emojiFrequency,
    skinToneIndex: s.skinToneIndex,
  }),
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
