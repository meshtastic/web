import { featureFlags } from "@core/services/featureFlags";
import { createStorage } from "@core/stores/utils/indexDB";
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

// Types
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
  nodesTableColumnVisibility: Record<NodeColumnKey, boolean>;
  nodesTableColumnOrder: NodeColumnKey[];

  // App state (some persisted, some ephemeral)
  rasterSources: RasterSource[]; // persisted
  selectedDeviceId: number; // ephemeral
  nodeNumToBeRemoved: number; // ephemeral
  connectDialogOpen: boolean; // ephemeral
  nodeNumDetails: number; // ephemeral
  commandPaletteOpen: boolean; // ephemeral

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
  setNodesTableColumnVisibility: (
    visibility: Record<NodeColumnKey, boolean>,
  ) => void;
  setNodesTableColumnOrder: (order: NodeColumnKey[]) => void;
  resetToDefaults: () => void;

  // App state actions
  setRasterSources: (sources: RasterSource[]) => void;
  addRasterSource: (source: RasterSource) => void;
  removeRasterSource: (index: number) => void;
  setSelectedDevice: (deviceId: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNodeNumToBeRemoved: (nodeNum: number) => void;
  setConnectDialogOpen: (open: boolean) => void;
  setNodeNumDetails: (nodeNum: number) => void;
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
  nodesTableColumnVisibility: {
    encryption: true,
    lastHeard: true,
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
  selectedDeviceId: 0,
  commandPaletteOpen: false,
  connectDialogOpen: false,
  nodeNumToBeRemoved: 0,
  nodeNumDetails: 0,
};

const persistApps = featureFlags.get("persistApp");

export const useUIStore = create<UIState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
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
        setShowConnectionLines: (enabled) =>
          set({ showConnectionLines: enabled }),
        setAutoCenterOnPosition: (enabled) =>
          set({ autoCenterOnPosition: enabled }),
        setMasterVolume: (volume) => set({ masterVolume: volume }),
        setMessageSoundEnabled: (enabled) =>
          set({ messageSoundEnabled: enabled }),
        setAlertSoundEnabled: (enabled) => set({ alertSoundEnabled: enabled }),
        setNodesTableColumnVisibility: (visibility) =>
          set({ nodesTableColumnVisibility: visibility }),
        setNodesTableColumnOrder: (order) =>
          set({ nodesTableColumnOrder: order }),
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
        setSelectedDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        setNodeNumToBeRemoved: (nodeNum) =>
          set({ nodeNumToBeRemoved: nodeNum }),
        setConnectDialogOpen: (open) => set({ connectDialogOpen: open }),
        setNodeNumDetails: (nodeNum) => set({ nodeNumDetails: nodeNum }),
      }),
      {
        name: persistApps ? "meshtastic-app-store" : "meshtastic-ui",
        storage: createStorage(),
        partialize: (state) => ({
          // Persist preferences
          theme: state.theme,
          compactMode: state.compactMode,
          showNodeAvatars: state.showNodeAvatars,
          language: state.language,
          timeFormat: state.timeFormat,
          distanceUnits: state.distanceUnits,
          coordinateFormat: state.coordinateFormat,
          mapStyle: state.mapStyle,
          showNodeLabels: state.showNodeLabels,
          showConnectionLines: state.showConnectionLines,
          autoCenterOnPosition: state.autoCenterOnPosition,
          masterVolume: state.masterVolume,
          messageSoundEnabled: state.messageSoundEnabled,
          alertSoundEnabled: state.alertSoundEnabled,
          nodesTableColumnVisibility: state.nodesTableColumnVisibility,
          nodesTableColumnOrder: state.nodesTableColumnOrder,
          // Persist rasterSources if persistApps is enabled
          ...(persistApps && { rasterSources: state.rasterSources }),
        }),
      },
    ),
  ),
);

// Backward compatibility exports
export const useAppStore = useUIStore;
export const usePreferencesStore = useUIStore;
export type AppState = UIState;
export type PreferencesState = UIState;
