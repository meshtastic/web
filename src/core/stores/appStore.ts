import { produce } from "immer";
import { create } from "zustand";

export interface RasterSource {
  enabled: boolean;
  title: string;
  tiles: string;
  tileSize: number;
}

export interface SavedServer {
  url: string;
  protocol: "http" | "https";
  host: string;
  lastUsed: number;
  status?: "online" | "offline" | "checking";
  deviceInfo?: {
    model?: string;
    nodeCount?: number;
    unreadCount?: number;
    firmwareVersion?: string;
  };
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
  savedServers: SavedServer[];

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

  // Server history management
  addSavedServer: (host: string, protocol: "http" | "https") => void;
  removeSavedServer: (url: string) => void;
  clearSavedServers: () => void;
  updateServerStatus: (
    url: string,
    status: "online" | "offline" | "checking",
  ) => void;
  getSavedServers: () => SavedServer[];

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
  savedServers: JSON.parse(
    localStorage.getItem("meshtastic-saved-servers") || "[]",
  ),

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

  // Server history management
  addSavedServer: (host: string, protocol: "http" | "https") => {
    set(
      produce<AppState>((draft) => {
        const url = `${protocol}://${host}`;
        const existingIndex = draft.savedServers.findIndex((s) =>
          s.url === url
        );

        if (existingIndex >= 0) {
          // Update last used time if server already exists
          draft.savedServers[existingIndex].lastUsed = Date.now();
        } else {
          // Add new server
          draft.savedServers.push({
            url,
            protocol,
            host,
            lastUsed: Date.now(),
            status: "checking",
          });
        }

        // Sort by last used (most recent first) and limit to 10 servers
        draft.savedServers.sort((a, b) => b.lastUsed - a.lastUsed);
        draft.savedServers = draft.savedServers.slice(0, 10);

        // Persist to localStorage
        localStorage.setItem(
          "meshtastic-saved-servers",
          JSON.stringify(draft.savedServers),
        );
      }),
    );
  },

  removeSavedServer: (url: string) => {
    set(
      produce<AppState>((draft) => {
        draft.savedServers = draft.savedServers.filter((s) => s.url !== url);
        localStorage.setItem(
          "meshtastic-saved-servers",
          JSON.stringify(draft.savedServers),
        );
      }),
    );
  },

  clearSavedServers: () => {
    set(
      produce<AppState>((draft) => {
        draft.savedServers = [];
        localStorage.removeItem("meshtastic-saved-servers");
      }),
    );
  },

  updateServerStatus: (
    url: string,
    status: "online" | "offline" | "checking",
  ) => {
    set(
      produce<AppState>((draft) => {
        const server = draft.savedServers.find((s) => s.url === url);
        if (server) {
          server.status = status;
          localStorage.setItem(
            "meshtastic-saved-servers",
            JSON.stringify(draft.savedServers),
          );
        }
      }),
    );
  },

  getSavedServers: () => {
    const state = get();
    return [...state.savedServers].sort((a, b) => b.lastUsed - a.lastUsed);
  },
}));
