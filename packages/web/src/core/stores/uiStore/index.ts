import type { ConversationType } from "@db/types";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// Types
export type Theme = "light" | "dark" | "system";
export type SplitMode = "none" | "vertical" | "horizontal";

export interface MessageTab {
  id: number;
  contactId: number;
  type: ConversationType;
}
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

export interface UIState {
  // Preferences (persisted)
  theme: Theme;
  compactMode: boolean;
  showNodeAvatars: boolean;
  language: Language;
  timeFormat: TimeFormat;
  distanceUnits: DistanceUnits;
  coordinateFormat: CoordinateFormat;
  mapStyle: MapStyle;
  showNodeLabels: boolean;
  showConnectionLines: boolean;
  autoCenterOnPosition: boolean;
  masterVolume: number;
  messageSoundEnabled: boolean;
  alertSoundEnabled: boolean;
  packetBatchSize: number;
  nodesTableColumnVisibility: Record<NodeColumnKey, boolean>;
  nodesTableColumnOrder: NodeColumnKey[];

  // App state (some persisted, some ephemeral)
  rasterSources: RasterSource[]; // persisted
  nodeNumToBeRemoved: number; // ephemeral
  connectDialogOpen: boolean; // ephemeral
  nodeNumDetails: number; // ephemeral
  tracerouteNodeNum: number; // ephemeral - node num for traceroute dialog
  commandPaletteOpen: boolean; // ephemeral

  // Messages page state (ephemeral)
  messageTabs: MessageTab[];
  activeMessageTabId: number | null;
  secondaryMessageTabId: number | null;
  messageSplitMode: SplitMode;

  // Preference actions
  setTheme: (theme: Theme) => void;
  setCompactMode: (enabled: boolean) => void;
  setShowNodeAvatars: (enabled: boolean) => void;
  setLanguage: (language: Language) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setDistanceUnits: (units: DistanceUnits) => void;
  setCoordinateFormat: (format: CoordinateFormat) => void;
  setMapStyle: (style: MapStyle) => void;
  setShowNodeLabels: (enabled: boolean) => void;
  setShowConnectionLines: (enabled: boolean) => void;
  setAutoCenterOnPosition: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setMessageSoundEnabled: (enabled: boolean) => void;
  setAlertSoundEnabled: (enabled: boolean) => void;
  setPacketBatchSize: (size: number) => void;
  setNodesTableColumnVisibility: (
    visibility: Record<NodeColumnKey, boolean>,
  ) => void;
  setNodesTableColumnOrder: (order: NodeColumnKey[]) => void;
  resetToDefaults: () => void;

  // App state actions
  setRasterSources: (sources: RasterSource[]) => void;
  addRasterSource: (source: RasterSource) => void;
  removeRasterSource: (index: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNodeNumToBeRemoved: (nodeNum: number) => void;
  setConnectDialogOpen: (open: boolean) => void;
  setNodeNumDetails: (nodeNum: number) => void;
  setTracerouteNodeNum: (nodeNum: number) => void;

  // Messages page actions
  openMessageTab: (contactId: number, type: ConversationType) => void;
  closeMessageTab: (tabId: number) => void;
  setActiveMessageTab: (tabId: number) => void;
  setSecondaryMessageTab: (tabId: number | null) => void;
  setMessageSplitMode: (mode: SplitMode) => void;
}

const defaultState = {
  // Preferences defaults
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

  // App state defaults
  rasterSources: [],
  commandPaletteOpen: false,
  connectDialogOpen: false,
  nodeNumToBeRemoved: 0,
  nodeNumDetails: 0,
  tracerouteNodeNum: 0,

  // Messages page defaults
  messageTabs: [] as MessageTab[],
  activeMessageTabId: null as number | null,
  secondaryMessageTabId: null as number | null,
  messageSplitMode: "none" as SplitMode,
};

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set) => ({
    ...defaultState,

    // Preference actions
    setTheme: (theme) => set({ theme }),
    setCompactMode: (enabled) => set({ compactMode: enabled }),
    setShowNodeAvatars: (enabled) => set({ showNodeAvatars: enabled }),
    setLanguage: (language) => set({ language }),
    setTimeFormat: (format) => set({ timeFormat: format }),
    setDistanceUnits: (units) => set({ distanceUnits: units }),
    setCoordinateFormat: (format) => set({ coordinateFormat: format }),
    setMapStyle: (style) => set({ mapStyle: style }),
    setShowNodeLabels: (enabled) => set({ showNodeLabels: enabled }),
    setShowConnectionLines: (enabled) => set({ showConnectionLines: enabled }),
    setAutoCenterOnPosition: (enabled) =>
      set({ autoCenterOnPosition: enabled }),
    setMasterVolume: (volume) => set({ masterVolume: volume }),
    setMessageSoundEnabled: (enabled) => set({ messageSoundEnabled: enabled }),
    setAlertSoundEnabled: (enabled) => set({ alertSoundEnabled: enabled }),
    setPacketBatchSize: (size) => set({ packetBatchSize: size }),
    setNodesTableColumnVisibility: (visibility) =>
      set({ nodesTableColumnVisibility: visibility }),
    setNodesTableColumnOrder: (order) => set({ nodesTableColumnOrder: order }),
    resetToDefaults: () =>
      set({
        theme: defaultState.theme,
        compactMode: defaultState.compactMode,
        showNodeAvatars: defaultState.showNodeAvatars,
        language: defaultState.language,
        timeFormat: defaultState.timeFormat,
        distanceUnits: defaultState.distanceUnits,
        coordinateFormat: defaultState.coordinateFormat,
        mapStyle: defaultState.mapStyle,
        showNodeLabels: defaultState.showNodeLabels,
        showConnectionLines: defaultState.showConnectionLines,
        autoCenterOnPosition: defaultState.autoCenterOnPosition,
        masterVolume: defaultState.masterVolume,
        messageSoundEnabled: defaultState.messageSoundEnabled,
        alertSoundEnabled: defaultState.alertSoundEnabled,
        packetBatchSize: defaultState.packetBatchSize,
        nodesTableColumnVisibility: defaultState.nodesTableColumnVisibility,
        nodesTableColumnOrder: defaultState.nodesTableColumnOrder,
      }),

    // App state actions
    setRasterSources: (sources) => set({ rasterSources: sources }),
    addRasterSource: (source) =>
      set((state) => ({
        rasterSources: [...state.rasterSources, source],
      })),
    removeRasterSource: (index) =>
      set((state) => ({
        rasterSources: state.rasterSources.filter((_, i) => i !== index),
      })),
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    setNodeNumToBeRemoved: (nodeNum) => set({ nodeNumToBeRemoved: nodeNum }),
    setConnectDialogOpen: (open) => set({ connectDialogOpen: open }),
    setNodeNumDetails: (nodeNum) => set({ nodeNumDetails: nodeNum }),
    setTracerouteNodeNum: (nodeNum) => set({ tracerouteNodeNum: nodeNum }),

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

