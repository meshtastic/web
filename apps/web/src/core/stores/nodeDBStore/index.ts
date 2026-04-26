import { create } from "@bufbuild/protobuf";
import { featureFlags } from "@core/services/featureFlags";
import { createStorage } from "@core/stores/utils/indexDB.ts";
import { Protobuf, type Types } from "@meshtastic/sdk";
import { produce } from "immer";
import { create as createStore, type StateCreator } from "zustand";
import { type PersistOptions, persist, subscribeWithSelector } from "zustand/middleware";
import type { ProcessPacketParams } from "./types.ts";

const IDB_KEY_NAME = "meshtastic-nodedb-store";
const CURRENT_STORE_VERSION = 0;
const NODE_RETENTION_DAYS = 14;

type NodeDBData = {
  // Persisted data
  id: number;
  myNodeNum: number | undefined;
  nodeMap: Map<number, Protobuf.Mesh.NodeInfo>;
};

export interface NodeDB extends NodeDBData {
  // Ephemeral state (not persisted)
  addNode: (nodeInfo: Protobuf.Mesh.NodeInfo) => void;
  removeNode: (nodeNum: number) => void;
  removeAllNodes: (keepMyNode?: boolean) => void;
  pruneStaleNodes: () => number;
  processPacket: (data: ProcessPacketParams) => void;
  addUser: (user: Types.PacketMetadata<Protobuf.Mesh.User>) => void;
  addPosition: (position: Types.PacketMetadata<Protobuf.Mesh.Position>) => void;
  addDeviceMetrics: (metrics: Types.PacketMetadata<Protobuf.Telemetry.DeviceMetrics>) => void;
  updateFavorite: (nodeNum: number, isFavorite: boolean) => void;
  updateIgnore: (nodeNum: number, isIgnored: boolean) => void;
  setNodeNum: (nodeNum: number) => void;

  getNodesLength: () => number;
  getNode: (nodeNum: number) => Protobuf.Mesh.NodeInfo | undefined;
  getNodes: (
    filter?: (node: Protobuf.Mesh.NodeInfo) => boolean,
    includeSelf?: boolean,
  ) => Protobuf.Mesh.NodeInfo[];
  getMyNode: () => Protobuf.Mesh.NodeInfo | undefined;
}

export interface nodeDBState {
  addNodeDB: (id: number) => NodeDB;
  removeNodeDB: (id: number) => void;
  getNodeDBs: () => NodeDB[];
  getNodeDB: (id: number) => NodeDB | undefined;
}

interface PrivateNodeDBState extends nodeDBState {
  nodeDBs: Map<number, NodeDB>;
}

type NodeDBPersisted = {
  nodeDBs: Map<number, NodeDBData>;
};

function nodeDBFactory(
  id: number,
  get: () => PrivateNodeDBState,
  set: typeof useNodeDBStore.setState,
  data?: Partial<NodeDBData>,
): NodeDB {
  const nodeMap = data?.nodeMap ?? new Map<number, Protobuf.Mesh.NodeInfo>();
  const myNodeNum = data?.myNodeNum;

  return {
    id,
    myNodeNum,
    nodeMap,

    addNode: (node) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }

          const existing = nodeDB.nodeMap.get(node.num);
          const isNew = !existing;

          // PKI / public-key validation now lives on the SDK NodesClient.
          // The store keeps an unvalidated mirror so legacy components that
          // still read from it stay usable; the SDK is the source of truth.
          const merged = existing
            ? {
                ...existing,
                ...node,
                user: node.user ?? existing.user,
                position: node.position ?? existing.position,
                deviceMetrics: node.deviceMetrics ?? existing.deviceMetrics,
              }
            : node;

          nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(merged.num, merged);

          if (isNew) {
            console.log(
              `[NodeDB] Adding new node from NodeInfo packet: ${merged.num} (${merged.user?.longName || "unknown"})`,
            );
          } else {
            console.log(
              `[NodeDB] Updating existing node from NodeInfo packet: ${merged.num} (${merged.user?.longName || "unknown"})`,
            );
          }
        }),
      ),

    removeNode: (nodeNum) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const updated = new Map(nodeDB.nodeMap);
          updated.delete(nodeNum);
          nodeDB.nodeMap = updated;
        }),
      ),

    removeAllNodes: (keepMyNode) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const newNodeMap = new Map<number, Protobuf.Mesh.NodeInfo>();
          if (
            keepMyNode &&
            nodeDB.myNodeNum !== undefined &&
            nodeDB.nodeMap.has(nodeDB.myNodeNum)
          ) {
            newNodeMap.set(
              nodeDB.myNodeNum,
              nodeDB.nodeMap.get(nodeDB.myNodeNum) ?? create(Protobuf.Mesh.NodeInfoSchema),
            );
          }
          nodeDB.nodeMap = newNodeMap;
        }),
      ),

    pruneStaleNodes: () => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const cutoffSec = nowSec - NODE_RETENTION_DAYS * 24 * 60 * 60;
      let prunedCount = 0;

      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }

          const newNodeMap = new Map<number, Protobuf.Mesh.NodeInfo>();

          for (const [nodeNum, node] of nodeDB.nodeMap) {
            if (nodeNum === nodeDB.myNodeNum || !node.lastHeard || node.lastHeard >= cutoffSec) {
              newNodeMap.set(nodeNum, node);
            } else {
              prunedCount++;
              console.log(
                `[NodeDB] Pruning stale node ${nodeNum} (last heard ${Math.floor((nowSec - node.lastHeard) / 86400)} days ago)`,
              );
            }
          }

          nodeDB.nodeMap = newNodeMap;
        }),
      );

      if (prunedCount > 0) {
        console.log(
          `[NodeDB] Pruned ${prunedCount} stale node(s) older than ${NODE_RETENTION_DAYS} days`,
        );
      }

      return prunedCount;
    },

    processPacket: (data) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const node = nodeDB.nodeMap.get(data.from);
          const nowSec = Math.floor(Date.now() / 1000);

          if (node) {
            const updated = {
              ...node,
              lastHeard: data.time > 0 ? data.time : nowSec,
              snr: data.snr,
            };
            nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(data.from, updated);
          } else {
            nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(
              data.from,
              create(Protobuf.Mesh.NodeInfoSchema, {
                num: data.from,
                lastHeard: data.time > 0 ? data.time : nowSec,
                snr: data.snr,
              }),
            );
          }
        }),
      ),

    addUser: (user) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const current = nodeDB.nodeMap.get(user.from);
          const isNew = !current;
          const updated = {
            ...(current ?? create(Protobuf.Mesh.NodeInfoSchema)),
            user: user.data,
            num: user.from,
          };
          nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(user.from, updated);

          if (isNew) {
            console.log(
              `[NodeDB] Adding new node from user packet: ${user.from} (${user.data.longName || "unknown"})`,
            );
          }
        }),
      ),

    addPosition: (position) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const current = nodeDB.nodeMap.get(position.from);
          const isNew = !current;
          const updated = {
            ...(current ?? create(Protobuf.Mesh.NodeInfoSchema)),
            position: position.data,
            num: position.from,
          };
          nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(position.from, updated);

          if (isNew) {
            console.log(`[NodeDB] Adding new node from position packet: ${position.from}`);
          }
        }),
      ),

    addDeviceMetrics: (metrics) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const current = nodeDB.nodeMap.get(metrics.from);
          // Only fold live device metrics into nodes we already know about, to
          // avoid creating identity-less phantom nodes from a stray telemetry packet.
          if (!current) {
            return;
          }
          const updated = {
            ...current,
            deviceMetrics: metrics.data,
            num: metrics.from,
          };
          nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(metrics.from, updated);
        }),
      ),

    setNodeNum: (nodeNum) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const newDB = draft.nodeDBs.get(id);
          if (!newDB) {
            throw new Error(`No nodeDB found for id: ${id}`);
          }

          newDB.myNodeNum = nodeNum;

          for (const [key, oldDB] of draft.nodeDBs) {
            if (key === id) continue;
            if (oldDB.myNodeNum === nodeNum) {
              // Same myNodeNum on a previously-persisted DB — fold its node
              // map into the active one. Public-key conflict detection
              // happens in the SDK NodesClient when those packets arrive,
              // so the merge here is straight last-write-wins.
              const mergedNodes = new Map(oldDB.nodeMap);
              for (const [num, newNode] of newDB.nodeMap) {
                mergedNodes.set(num, newNode);
              }
              newDB.nodeMap = mergedNodes;
              draft.nodeDBs.delete(oldDB.id);
            }
          }
        }),
      ),

    updateFavorite: (nodeNum, isFavorite) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }

          const node = nodeDB.nodeMap.get(nodeNum);
          if (node) {
            nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(nodeNum, {
              ...node,
              isFavorite: isFavorite,
            });
          }
        }),
      ),

    updateIgnore: (nodeNum, isIgnored) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }

          const node = nodeDB.nodeMap.get(nodeNum);
          if (node) {
            nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(nodeNum, {
              ...node,
              isIgnored: isIgnored,
            });
          }
        }),
      ),

    getNodesLength: () => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }
      return nodeDB.nodeMap.size;
    },

    getNode: (nodeNum) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }
      return nodeDB.nodeMap.get(nodeNum);
    },

    getNodes: (filter, includeSelf) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }
      const all = Array.from(nodeDB.nodeMap.values()).filter((n) =>
        includeSelf ? true : n.num !== nodeDB.myNodeNum,
      );

      return filter ? all.filter(filter) : all;
    },

    getMyNode: () => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }
      if (nodeDB.myNodeNum) {
        return nodeDB.nodeMap.get(nodeDB.myNodeNum) ?? create(Protobuf.Mesh.NodeInfoSchema);
      }
    },
  };
}

export const nodeDBInitializer: StateCreator<PrivateNodeDBState> = (set, get) => ({
  nodeDBs: new Map(),

  addNodeDB: (id) => {
    const existing = get().nodeDBs.get(id);
    if (existing) {
      existing.pruneStaleNodes();
      return existing;
    }

    const nodeDB = nodeDBFactory(id, get, set);
    set(
      produce<PrivateNodeDBState>((draft) => {
        draft.nodeDBs = new Map(draft.nodeDBs).set(id, nodeDB);
      }),
    );

    nodeDB.pruneStaleNodes();

    return nodeDB;
  },
  removeNodeDB: (id) => {
    set(
      produce<PrivateNodeDBState>((draft) => {
        const updated = new Map(draft.nodeDBs);
        updated.delete(id);
        draft.nodeDBs = updated;
      }),
    );
  },
  getNodeDBs: () => Array.from(get().nodeDBs.values()),
  getNodeDB: (id) => get().nodeDBs.get(id),
});

const persistOptions: PersistOptions<PrivateNodeDBState, NodeDBPersisted> = {
  name: IDB_KEY_NAME,
  storage: createStorage<NodeDBPersisted>(),
  version: CURRENT_STORE_VERSION,
  partialize: (s): NodeDBPersisted => ({
    nodeDBs: new Map(
      Array.from(s.nodeDBs.entries()).map(([id, db]) => [
        id,
        {
          id: db.id,
          myNodeNum: db.myNodeNum,
          nodeMap: db.nodeMap,
        },
      ]),
    ),
  }),
  onRehydrateStorage: () => (state) => {
    if (!state) {
      return;
    }
    console.debug(
      "NodeDBStore: Rehydrating state with ",
      state.nodeDBs.size,
      " nodeDBs -",
      state.nodeDBs,
    );

    useNodeDBStore.setState(
      produce<PrivateNodeDBState>((draft) => {
        const rebuilt = new Map<number, NodeDB>();
        for (const [id, data] of (draft.nodeDBs as unknown as Map<number, NodeDBData>).entries()) {
          if (data.myNodeNum !== undefined) {
            rebuilt.set(
              id,
              nodeDBFactory(id, useNodeDBStore.getState, useNodeDBStore.setState, data),
            );
          }
        }
        draft.nodeDBs = rebuilt;
      }),
    );
  },
};

const persistNodes = featureFlags.get("persistNodeDB");
console.debug(`NodeDBStore: Persisting nodes is ${persistNodes ? "enabled" : "disabled"}`);

export const useNodeDBStore = persistNodes
  ? createStore(subscribeWithSelector(persist(nodeDBInitializer, persistOptions)))
  : createStore(subscribeWithSelector(nodeDBInitializer));
