import type { ConversationType } from "@data/types";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface MessageTab {
  id: number;
  contactId: number;
  type: ConversationType;
}

export type SplitMode = "none" | "vertical" | "horizontal";

// Dialog types - moved from device store
export interface Dialogs {
  import: boolean;
  QR: boolean;
  shutdown: boolean;
  reboot: boolean;
  deviceName: boolean;
  deviceShare: boolean;
  nodeRemoval: boolean;
  pkiBackup: boolean;
  nodeDetails: boolean;
  unsafeRoles: boolean;
  refreshKeys: boolean;
  deleteMessages: boolean;
  managedMode: boolean;
  clientNotification: boolean;
  resetNodeDb: boolean;
  factoryResetDevice: boolean;
  factoryResetConfig: boolean;
  tracerouteResponse: boolean;
}

export type DialogVariant = keyof Dialogs;

// These are exported for type-safety when using the usePreference hook

export type Theme = "light" | "dark" | "system";
export type Language =
  | "en"
  | "es"
  | "de"
  | "fr"
  | "pt"
  | "zh"
  | "be-BY"
  | "bg-BG"
  | "cs-CZ"
  | "fi-FI"
  | "hu-HU"
  | "it-IT"
  | "ja-JP"
  | "ko-KR"
  | "nl-NL"
  | "pl-PL"
  | "pt-BR"
  | "pt-PT"
  | "sv-SE"
  | "tr-TR"
  | "uk-UA"
  | "zh-CN";
export type TimeFormat = "12h" | "24h";
export type DistanceUnits = "imperial" | "metric";
export type CoordinateFormat = "dd" | "dms" | "utm";
export type MapStyle = "dark" | "light" | "satellite" | "terrain" | "streets";

export interface RasterSource {
  enabled: boolean;
  title: string;
  tiles: string;
  tileSize: number;
}

export type NodeColumnKey =
  | "encryption"
  | "lastHeard"
  | "signal"
  | "battery"
  | "altitude"
  | "hops"
  | "temp"
  | "chUtil"
  | "model"
  | "role"
  | "nodeId";

// Default values for preferences (used by components with usePreference)
export const DEFAULT_PREFERENCES = {
  theme: "system" as Theme,
  compactMode: false,
  showNodeAvatars: true,
  language: "en" as Language,
  timeFormat: "12h" as TimeFormat,
  distanceUnits: "imperial" as DistanceUnits,
  coordinateFormat: "dd" as CoordinateFormat,
  mapStyle: "dark" as MapStyle,
  showNodeLabels: true,
  showConnectionLines: true,
  autoCenterOnPosition: false,
  masterVolume: 75,
  messageSoundEnabled: true,
  alertSoundEnabled: true,
  packetBatchSize: 25,
  nodesTableColumnVisibility: {
    encryption: true,
    lastHeard: true,
    signal: true,
    battery: true,
    altitude: true,
    hops: true,
    temp: true,
    chUtil: true,
    model: true,
    role: true,
    nodeId: true,
  } as Record<NodeColumnKey, boolean>,
  nodesTableColumnOrder: [
    "encryption",
    "lastHeard",
    "signal",
    "battery",
    "altitude",
    "hops",
    "temp",
    "chUtil",
    "model",
    "role",
    "nodeId",
  ] as NodeColumnKey[],
  rasterSources: [] as RasterSource[],
};

export interface UIState {
  // Ephemeral app state (not persisted)
  nodeNumToBeRemoved: number;
  connectDialogOpen: boolean;
  nodeNumDetails: number;
  tracerouteNodeNum: number;

  // Dialog state (moved from device store)
  dialogs: Dialogs;

  // Messages page state (ephemeral)
  messageTabs: MessageTab[];
  activeMessageTabId: number | null;
  secondaryMessageTabId: number | null;
  messageSplitMode: SplitMode;

  // Actions
  setNodeNumToBeRemoved: (nodeNum: number) => void;
  setConnectDialogOpen: (open: boolean) => void;
  setNodeNumDetails: (nodeNum: number) => void;
  setTracerouteNodeNum: (nodeNum: number) => void;

  // Dialog actions
  setDialogOpen: (dialog: DialogVariant, open: boolean) => void;
  getDialogOpen: (dialog: DialogVariant) => boolean;

  // Messages page actions
  openMessageTab: (contactId: number, type: ConversationType) => void;
  closeMessageTab: (tabId: number) => void;
  setActiveMessageTab: (tabId: number) => void;
  setSecondaryMessageTab: (tabId: number | null) => void;
  setMessageSplitMode: (mode: SplitMode) => void;
}

const defaultDialogs: Dialogs = {
  import: false,
  QR: false,
  shutdown: false,
  reboot: false,
  deviceName: false,
  deviceShare: false,
  nodeRemoval: false,
  pkiBackup: false,
  nodeDetails: false,
  unsafeRoles: false,
  refreshKeys: false,
  deleteMessages: false,
  managedMode: false,
  clientNotification: false,
  resetNodeDb: false,
  factoryResetDevice: false,
  factoryResetConfig: false,
  tracerouteResponse: false,
};

const defaultState = {
  // Ephemeral state defaults
  connectDialogOpen: false,
  nodeNumToBeRemoved: 0,
  nodeNumDetails: 0,
  tracerouteNodeNum: 0,

  // Dialog state
  dialogs: defaultDialogs,

  // Messages page defaults
  messageTabs: [] as MessageTab[],
  activeMessageTabId: null as number | null,
  secondaryMessageTabId: null as number | null,
  messageSplitMode: "none" as SplitMode,
};

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    ...defaultState,

    // Ephemeral state actions
    setNodeNumToBeRemoved: (nodeNum) => set({ nodeNumToBeRemoved: nodeNum }),
    setConnectDialogOpen: (open) => set({ connectDialogOpen: open }),
    setNodeNumDetails: (nodeNum) => set({ nodeNumDetails: nodeNum }),
    setTracerouteNodeNum: (nodeNum) => set({ tracerouteNodeNum: nodeNum }),

    // Dialog actions
    setDialogOpen: (dialog, open) =>
      set((state) => ({
        dialogs: { ...state.dialogs, [dialog]: open },
      })),
    getDialogOpen: (dialog) => get().dialogs[dialog],

    // Messages page actions
    openMessageTab: (contactId, type) =>
      set((state) => {
        const existingTab = state.messageTabs.find(
          (t) => t.contactId === contactId && t.type === type,
        );
        if (existingTab) {
          return { activeMessageTabId: existingTab.id };
        }
        const newTab: MessageTab = {
          id: Date.now(),
          contactId,
          type,
        };
        return {
          messageTabs: [...state.messageTabs, newTab],
          activeMessageTabId: newTab.id,
        };
      }),
    closeMessageTab: (tabId) =>
      set((state) => {
        const newTabs = state.messageTabs.filter((t) => t.id !== tabId);
        const updates: Partial<UIState> = { messageTabs: newTabs };

        // Update active tab if needed
        if (state.activeMessageTabId === tabId && newTabs.length > 0) {
          updates.activeMessageTabId = newTabs[newTabs.length - 1]?.id ?? null;
        } else if (newTabs.length === 0) {
          updates.activeMessageTabId = null;
        }

        // Update secondary tab if needed
        if (state.secondaryMessageTabId === tabId) {
          updates.secondaryMessageTabId = null;
          if (state.messageSplitMode !== "none" && newTabs.length < 2) {
            updates.messageSplitMode = "none";
          }
        }

        return updates;
      }),
    setActiveMessageTab: (tabId) => set({ activeMessageTabId: tabId }),
    setSecondaryMessageTab: (tabId) => set({ secondaryMessageTabId: tabId }),
    setMessageSplitMode: (mode) =>
      set((state) => {
        if (mode === "none") {
          return { messageSplitMode: mode, secondaryMessageTabId: null };
        }
        // Auto-select secondary tab if not set
        if (!state.secondaryMessageTabId && state.messageTabs.length > 1) {
          const otherTab = state.messageTabs.find(
            (t) => t.id !== state.activeMessageTabId,
          );
          return {
            messageSplitMode: mode,
            secondaryMessageTabId: otherTab?.id ?? null,
          };
        }
        return { messageSplitMode: mode };
      }),
  })),
);
