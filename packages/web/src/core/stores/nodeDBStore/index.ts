import { create } from "@bufbuild/protobuf";
import { featureFlags } from "@core/services/featureFlags";
import { validateIncomingNode } from "@core/stores/nodeDBStore/nodeValidation";
import { evictOldestEntries } from "@core/stores/utils/evictOldestEntries.ts";
import { createStorage } from "@core/stores/utils/indexDB.ts";
import { Protobuf, type Types } from "@meshtastic/core";
import { produce } from "immer";
import { create as createStore, type StateCreator } from "zustand";
import {
  type PersistOptions,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import type { NodeError, NodeErrorType, ProcessPacketParams } from "./types.ts";

const IDB_KEY_NAME = "meshtastic-nodedb-store";
const CURRENT_STORE_VERSION = 0;
const NODEDB_RETENTION_NUM = 10;

type NodeDBData = {
  // Persisted data
  id: number;
  myNodeNum: number | undefined;
  nodeMap: Map<number, Protobuf.Mesh.NodeInfo>;
  nodeErrors: Map<number, NodeError>;
};

export interface NodeDB extends NodeDBData {
  // Ephemeral state (not persisted)
  addNode: (nodeInfo: Protobuf.Mesh.NodeInfo) => void;
  removeNode: (nodeNum: number) => void;
  removeAllNodes: (keepMyNode?: boolean) => void;
  processPacket: (data: ProcessPacketParams) => void;
  addUser: (user: Types.PacketMetadata<Protobuf.Mesh.User>) => void;
  addPosition: (position: Types.PacketMetadata<Protobuf.Mesh.Position>) => void;
  updateFavorite: (nodeNum: number, isFavorite: boolean) => void;
  updateIgnore: (nodeNum: number, isIgnored: boolean) => void;
  setNodeNum: (nodeNum: number) => void;
  setNodeError: (nodeNum: number, error: NodeErrorType) => void;
  clearNodeError: (nodeNum: number) => void;
  removeAllNodeErrors: () => void;

  getNodesLength: () => number;
  getNode: (nodeNum: number) => Protobuf.Mesh.NodeInfo | undefined;
  getNodes: (
    filter?: (node: Protobuf.Mesh.NodeInfo) => boolean,
    includeSelf?: boolean,
  ) => Protobuf.Mesh.NodeInfo[];
  getMyNode: () => Protobuf.Mesh.NodeInfo | undefined;

  getNodeError: (nodeNum: number) => NodeError | undefined;
  hasNodeError: (nodeNum: number) => boolean;
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
  const nodeErrors = data?.nodeErrors ?? new Map<number, NodeError>();
  const myNodeNum = data?.myNodeNum;

  return {
    id,
    myNodeNum,
    nodeMap,
    nodeErrors,

    addNode: (node) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          // Use validation to check the new node before adding
          const next = validateIncomingNode(
            node,
            (nodeNum: number, err: NodeErrorType) => {
              nodeDB.setNodeError(nodeNum, err);
            },
            (filter?: (node: Protobuf.Mesh.NodeInfo) => boolean) =>
              nodeDB.getNodes(filter, true),
          );

          if (!next) {
            // Validation failed and error has been set inside validateIncomingNode
            return;
          }

          nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(node.num, next);
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
              nodeDB.nodeMap.get(nodeDB.myNodeNum) ??
                create(Protobuf.Mesh.NodeInfoSchema),
            );
          }
          nodeDB.nodeMap = newNodeMap;
        }),
      ),

    setNodeError: (nodeNum, error) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          nodeDB.nodeErrors = new Map(nodeDB.nodeErrors).set(nodeNum, {
            node: nodeNum,
            error,
          });
        }),
      ),

    clearNodeError: (nodeNum) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const updated = new Map(nodeDB.nodeErrors);
          updated.delete(nodeNum);
          nodeDB.nodeErrors = updated;
        }),
      ),

    removeAllNodeErrors: () =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          nodeDB.nodeErrors = new Map<number, NodeError>();
        }),
      ),

    processPacket: (data) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const node = nodeDB.nodeMap.get(data.from);
          const nowSec = Math.floor(Date.now() / 1000); // lastHeard is in seconds(!)

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
                lastHeard: data.time > 0 ? data.time : nowSec, // fallback to now if time is 0 or negative,
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
          const current =
            nodeDB.nodeMap.get(user.from) ??
            create(Protobuf.Mesh.NodeInfoSchema);
          const updated = { ...current, user: user.data, num: user.from };
          nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(user.from, updated);
        }),
      ),

    addPosition: (position) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          const current =
            nodeDB.nodeMap.get(position.from) ??
            create(Protobuf.Mesh.NodeInfoSchema);
          const updated = {
            ...current,
            position: position.data,
            num: position.from,
          };
          nodeDB.nodeMap = new Map(nodeDB.nodeMap).set(position.from, updated);
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
            if (key === id) {
              // short-circuit self
              continue;
            }
            if (oldDB.myNodeNum === nodeNum) {
              // We found the oldDB (same myNodeNum). Merge node-by-node as if the new nodes are added with addNode

              const mergedNodes = new Map(oldDB.nodeMap);
              const mergedErrors = new Map(oldDB.nodeErrors);

              const getNodesProxy = (
                filter?: (node: Protobuf.Mesh.NodeInfo) => boolean,
              ): Protobuf.Mesh.NodeInfo[] => {
                const arr = Array.from(mergedNodes.values());
                return filter ? arr.filter(filter) : arr;
              };

              const setErrorProxy = (nodeNum: number, err: NodeErrorType) => {
                mergedErrors.set(nodeNum, {
                  node: nodeNum,
                  error: err,
                });
              };

              for (const [num, newNode] of newDB.nodeMap) {
                const next = validateIncomingNode(
                  newNode,
                  setErrorProxy,
                  getNodesProxy,
                );
                if (next) {
                  mergedNodes.set(num, next);
                }

                const err = newDB.getNodeError(num);
                if (err && !oldDB.hasNodeError(num)) {
                  mergedErrors.set(num, err);
                }
              }

              // finalize: move maps into newDB and drop oldDB entry
              newDB.nodeMap = mergedNodes;
              newDB.nodeErrors = mergedErrors;
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
        return (
          nodeDB.nodeMap.get(nodeDB.myNodeNum) ??
          create(Protobuf.Mesh.NodeInfoSchema)
        );
      }
    },

    getNodeError: (nodeNum) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }
      return nodeDB.nodeErrors.get(nodeNum);
    },

    hasNodeError: (nodeNum) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }
      return nodeDB.nodeErrors.has(nodeNum);
    },
  };
}

export const nodeDBInitializer: StateCreator<PrivateNodeDBState> = (
  set,
  get,
) => ({
  nodeDBs: new Map(),

  addNodeDB: (id) => {
    const existing = get().nodeDBs.get(id);
    if (existing) {
      return existing;
    }

    const nodeDB = nodeDBFactory(id, get, set);
    set(
      produce<PrivateNodeDBState>((draft) => {
        draft.nodeDBs = new Map(draft.nodeDBs).set(id, nodeDB);

        // Enforce retention limit
        evictOldestEntries(draft.nodeDBs, NODEDB_RETENTION_NUM);
      }),
    );

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
          nodeErrors: db.nodeErrors,
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
        for (const [id, data] of (
          draft.nodeDBs as unknown as Map<number, NodeDBData>
        ).entries()) {
          if (data.myNodeNum !== undefined) {
            // Only rebuild if there is a nodenum set otherwise orphan dbs will acumulate
            rebuilt.set(
              id,
              nodeDBFactory(
                id,
                useNodeDBStore.getState,
                useNodeDBStore.setState,
                data,
              ),
            );
          }
        }
        draft.nodeDBs = rebuilt;
      }),
    );
  },
};

// Add persist middleware on the store if the feature flag is enabled
const persistNodes = featureFlags.get("persistNodeDB");
console.debug(
  `NodeDBStore: Persisting nodes is ${persistNodes ? "enabled" : "disabled"}`,
);

export const useNodeDBStore = persistNodes
  ? createStore(
      subscribeWithSelector(persist(nodeDBInitializer, persistOptions)),
    )
  : createStore(subscribeWithSelector(nodeDBInitializer));
