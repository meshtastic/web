import type { TableColumn } from "@core/hooks/useColumnManager.ts";
import { produce } from "immer";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createTableColumnStore } from "./createTableColumnStore.ts";

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

export interface NodesTableColumn extends TableColumn {
  id: string;
  key: string;
  title: string;
  visible: boolean;
  sortable: boolean;
}

const defaultNodesTableColumns: NodesTableColumn[] = [
  { id: "avatar", key: "avatar", title: "", visible: true, sortable: false },
  {
    id: "longName",
    key: "longName",
    title: "nodesTable.headings.longName",
    visible: true,
    sortable: true,
  },
  {
    id: "connection",
    key: "connection",
    title: "nodesTable.headings.connection",
    visible: true,
    sortable: true,
  },
  {
    id: "lastHeard",
    key: "lastHeard",
    title: "nodesTable.headings.lastHeard",
    visible: true,
    sortable: true,
  },
  {
    id: "encryption",
    key: "encryption",
    title: "nodesTable.headings.encryption",
    visible: true,
    sortable: false,
  },
  { id: "snr", key: "snr", title: "unit.snr", visible: true, sortable: true },
  {
    id: "model",
    key: "model",
    title: "nodesTable.headings.model",
    visible: true,
    sortable: true,
  },
  {
    id: "macAddress",
    key: "macAddress",
    title: "nodesTable.headings.macAddress",
    visible: true,
    sortable: true,
  },
  // Additional columns we can add
  {
    id: "shortName",
    key: "shortName",
    title: "Short Name",
    visible: false,
    sortable: true,
  },
  {
    id: "nodeId",
    key: "nodeId",
    title: "Node ID",
    visible: false,
    sortable: true,
  },
  { id: "role", key: "role", title: "Role", visible: false, sortable: true },
  {
    id: "batteryLevel",
    key: "batteryLevel",
    title: "Battery Level",
    visible: false,
    sortable: true,
  },
  {
    id: "channelUtilization",
    key: "channelUtilization",
    title: "Channel Utilization",
    visible: false,
    sortable: true,
  },
  {
    id: "airtimeUtilization",
    key: "airtimeUtilization",
    title: "Airtime Utilization",
    visible: false,
    sortable: true,
  },
  {
    id: "uptime",
    key: "uptime",
    title: "Uptime",
    visible: false,
    sortable: true,
  },
  {
    id: "position",
    key: "position",
    title: "Position",
    visible: false,
    sortable: false,
  },
];

// Create the nodes table column store
const nodesTableColumnStore = createTableColumnStore({
  defaultColumns: defaultNodesTableColumns,
  storeName: "nodesTable",
});

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

  // Nodes table column management
  nodesTableColumns: NodesTableColumn[];

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

  // Nodes table column management actions
  updateColumnVisibility: (columnId: string, visible: boolean) => void;
  updateNodesTableColumn: (
    columnId: string,
    updates: Partial<NodesTableColumn>,
  ) => void;
  resetColumnsToDefault: () => void;
  setNodesTableColumns: (columns: NodesTableColumn[]) => void;

  // Error management
  hasErrors: () => boolean;
  getErrorMessage: (field: string) => string | undefined;
  hasFieldError: (field: string) => boolean;
  addError: (field: string, message: string) => void;
  removeError: (field: string) => void;
  clearErrors: () => void;
  setNewErrors: (newErrors: ErrorState[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      // Create a wrapper for set that matches the expected signature
      const setWrapper = (fn: (state: any) => void) => {
        set(produce<AppState>(fn));
      };

      // Get the column management actions from the generic store
      const columnActions = nodesTableColumnStore.createActions(
        setWrapper,
        get,
      );

      return {
        selectedDevice: 0,
        devices: [],
        currentPage: "messages",
        rasterSources: [],
        commandPaletteOpen: false,
        connectDialogOpen: false,
        nodeNumToBeRemoved: 0,
        nodeNumDetails: 0,
        errors: [],
        nodesTableColumns: nodesTableColumnStore.initialState.columns,

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

        // Nodes table column management - delegate to generic actions
        updateColumnVisibility: columnActions.updateColumnVisibility,
        updateNodesTableColumn: columnActions.updateColumn,
        resetColumnsToDefault: columnActions.resetColumnsToDefault,
        setNodesTableColumns: columnActions.setColumns,

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
      };
    },
    {
      name: "meshtastic-app-store",
      partialize: (state) => ({
        nodesTableColumns: state.nodesTableColumns,
        rasterSources: state.rasterSources,
      }),
    },
  ),
);
