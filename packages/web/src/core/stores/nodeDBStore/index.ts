import { create } from "@bufbuild/protobuf";
import { createStorage } from "@core/stores/utils/indexDB.ts";
import { Protobuf, type Types } from "@meshtastic/core";
import { produce } from "immer";
import { create as createStore } from "zustand";
import { persist } from "zustand/middleware";
import type { NodeError, NodeErrorType, ProcessPacketParams } from "./types";

const CURRENT_STORE_VERSION = 0;

const NODEDB_RETENTION_NUM = 10;

export interface NodeDB {
  id: number;
  myNodeNum: number | undefined;
  nodeMap: Map<number, Protobuf.Mesh.NodeInfo>;
  nodeErrors: Map<number, NodeError>;

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
  ) => Protobuf.Mesh.NodeInfo[];
  getMyNode: () => Protobuf.Mesh.NodeInfo;

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

type NodeDBData = {
  id: number;
  myNodeNum: number | undefined;
  nodeMap: Map<number, Protobuf.Mesh.NodeInfo>;
  nodeErrors: Map<number, NodeError>;
};

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
          nodeDB.nodeMap.set(node.num, node);
        }),
      ),

    removeNode: (nodeNum) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          nodeDB.nodeMap.delete(nodeNum);
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
          nodeDB.nodeErrors.set(nodeNum, { node: nodeNum, error });
        }),
      ),

    clearNodeError: (nodeNum) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(`No nodeDB found (id: ${id})`);
          }
          nodeDB.nodeErrors.delete(nodeNum);
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
          if (node) {
            node.lastHeard = data.time;
            node.snr = data.snr;
            nodeDB.nodeMap.set(data.from, node);
          } else {
            nodeDB.nodeMap.set(
              data.from,
              create(Protobuf.Mesh.NodeInfoSchema, {
                num: data.from,
                lastHeard: data.time,
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
          current.user = user.data;
          current.num = user.from;
          nodeDB.nodeMap.set(user.from, current);
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
          current.position = position.data;
          current.num = position.from;
          nodeDB.nodeMap.set(position.from, current);
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
              continue;
            }
            if (oldDB.myNodeNum === nodeNum) {
              // The new DB is typically empty when nodenum is set, so we can safely copy over from the old DB
              // otherwise, discard the old DB completely
              if (newDB.nodeMap.size === 0) {
                newDB.nodeMap = oldDB.nodeMap;
                newDB.nodeErrors = oldDB.nodeErrors;
              } else {
                console.error(
                  `NodeDB with id: ${id} already has nodes, not merging with old DB`,
                );
              }

              draft.nodeDBs.delete(key);
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
            node.isFavorite = isFavorite;
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
            node.isIgnored = isIgnored;
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

    getNodes: (filter) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }
      const all = Array.from(nodeDB.nodeMap.values()).filter(
        (n) => n.num !== nodeDB.myNodeNum,
      );
      return filter ? all.filter(filter) : all;
    },

    getMyNode: () => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(`No nodeDB found (id: ${id})`);
      }
      if (!nodeDB.myNodeNum) {
        throw new Error(`No myNodeNum set for nodeDB with id: ${id}`);
      }
      return (
        nodeDB.nodeMap.get(nodeDB.myNodeNum) ??
        create(Protobuf.Mesh.NodeInfoSchema)
      );
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

export const useNodeDBStore = createStore<PrivateNodeDBState>()(
  persist(
    (set, get) => ({
      nodeDBs: new Map(),

      addNodeDB: (id) => {
        const existing = get().nodeDBs.get(id);
        if (existing) {
          return existing;
        }

        const nodeDB = nodeDBFactory(id, get, set);
        set(
          produce<PrivateNodeDBState>((draft) => {
            draft.nodeDBs.set(id, nodeDB);

            // If over limit, remove oldest inserted. FIFO
            if (draft.nodeDBs.size > NODEDB_RETENTION_NUM) {
              const firstKey = draft.nodeDBs.keys().next().value;
              if (firstKey !== undefined) {
                draft.nodeDBs.delete(firstKey);
              }
            }
          }),
        );

        return nodeDB;
      },
      removeNodeDB: (id) => {
        set(
          produce<PrivateNodeDBState>((draft) => {
            draft.nodeDBs.delete(id);
          }),
        );
      },
      getNodeDBs: () => Array.from(get().nodeDBs.values()),
      getNodeDB: (id) => get().nodeDBs.get(id),
    }),
    {
      name: "meshtastic-nodedb-store",
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
    },
  ),
);
