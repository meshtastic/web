import { create } from "@bufbuild/protobuf";
import { createStorageWithMapSupport } from "@core/stores/utils/indexDB.ts";
import { Protobuf, type Types } from "@meshtastic/core";
import { produce } from "immer";
import { create as createStore } from "zustand";
import { persist } from "zustand/middleware";
import type { NodeError, ProcessPacketParams } from "./types";

const CURRENT_STORE_VERSION = 0;

export interface NodeDB {
  id: number;
  myNodeNum: number | undefined;
  nodeMap: Map<number, Protobuf.Mesh.NodeInfo>;
  nodeErrors: Map<number, NodeError>;

  addNode: (nodeInfo: Protobuf.Mesh.NodeInfo) => void;
  removeNode: (nodeNum: number) => void;
  processPacket: (data: ProcessPacketParams) => void;
  addUser: (user: Types.PacketMetadata<Protobuf.Mesh.User>) => void;
  addPosition: (position: Types.PacketMetadata<Protobuf.Mesh.Position>) => void;
  updateFavorite: (nodeNum: number, isFavorite: boolean) => void;
  updateIgnore: (nodeNum: number, isIgnored: boolean) => void;
  setNodeNum: (nodeNum: number) => void;
  setNodeError: (nodeNum: number, error: string) => void;
  clearNodeError: (nodeNum: number) => void;

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

function mergeIntoCurrent(target: NodeDB, incoming: NodeDB) {
  for (const [n, info] of incoming.nodeMap) {
    if (!target.nodeMap.has(n)) {
      target.nodeMap.set(n, info);
    }
  }
  for (const [n, err] of incoming.nodeErrors) {
    if (!target.nodeErrors.has(n)) {
      target.nodeErrors.set(n, err);
    }
  }
}

function nodeDBFactory(
  id: number,
  get: () => PrivateNodeDBState,
  set: typeof useNodeDBStore.setState,
  data?: Partial<NodeDBData>,
): NodeDB {
  const nodeMap = data?.nodeMap ?? new Map<number, Protobuf.Mesh.NodeInfo>();
  const nodeErrors = data?.nodeErrors ?? new Map<number, NodeError>();
  let myNodeNum = data?.myNodeNum;

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
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
          }
          nodeDB.nodeMap.set(node.num, node);
        }),
      ),

    removeNode: (nodeNum) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
          }
          nodeDB.nodeMap.delete(nodeNum);
        }),
      ),

    setNodeError: (nodeNum, error) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
          }
          nodeDB.nodeErrors.set(nodeNum, { node: nodeNum, error });
        }),
      ),

    clearNodeError: (nodeNum) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
          }
          nodeDB.nodeErrors.delete(nodeNum);
        }),
      ),

    processPacket: (data) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
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
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
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
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
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
          console.debug(
            `Setting myNodeNum for nodeDB with id: ${id} to ${nodeNum}`,
          );
          const current = draft.nodeDBs.get(id);
          if (!current) {
            throw new Error(`No nodeDB found for id: ${id}`);
          }

          // There might already be an entry for this nodeNum, so we need to merge
          // it into the current nodeDB.
          myNodeNum = nodeNum;
          current.myNodeNum = nodeNum;

          for (const [k, other] of draft.nodeDBs) {
            if (k === id) {
              continue;
            }
            if (other.myNodeNum === nodeNum) {
              mergeIntoCurrent(current, other); // current wins on conflicts
              draft.nodeDBs.delete(k);
            }
          }
        }),
      ),

    updateFavorite: (nodeNum, isFavorite) =>
      set(
        produce<PrivateNodeDBState>((draft) => {
          const nodeDB = draft.nodeDBs.get(id);
          if (!nodeDB) {
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
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
            throw new Error(
              `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
            );
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
        throw new Error(
          `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
        );
      }
      return nodeDB.nodeMap.size;
    },

    getNode: (nodeNum) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(
          `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
        );
      }
      return nodeDB.nodeMap.get(nodeNum);
    },

    getNodes: (filter) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(
          `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
        );
      }
      const all = Array.from(nodeDB.nodeMap.values()).filter(
        (n) => n.num !== myNodeNum,
      );
      return filter ? all.filter(filter) : all;
    },

    getMyNode: () => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(
          `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
        );
      }
      if (!myNodeNum) {
        throw new Error(`No myNodeNum set for nodeDB with id: ${id}`);
      }
      return (
        nodeDB.nodeMap.get(myNodeNum) ?? create(Protobuf.Mesh.NodeInfoSchema)
      );
    },

    getNodeError: (nodeNum) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(
          `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
        );
      }
      return nodeDB.nodeErrors.get(nodeNum);
    },

    hasNodeError: (nodeNum) => {
      const nodeDB = get().nodeDBs.get(id);
      if (!nodeDB) {
        throw new Error(
          `No nodeDB found for myNodeNum: ${myNodeNum} (id: ${id})`,
        );
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
          }),
        );
        return nodeDB;
      },
      removeNodeDB: (userId) => {
        set(
          produce<PrivateNodeDBState>((draft) => {
            draft.nodeDBs.delete(userId);
          }),
        );
      },
      getNodeDBs: () => Array.from(get().nodeDBs.values()),
      getNodeDB: (id) => get().nodeDBs.get(id),
    }),
    {
      name: "meshtastic-nodedb-store",
      storage: createStorageWithMapSupport<NodeDBPersisted>(),
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
        console.debug("NodeDBStore: Rehydrating state", state);

        useNodeDBStore.setState(
          produce<PrivateNodeDBState>((draft) => {
            const rebuilt = new Map<number, NodeDB>();
            for (const [id, data] of (
              draft.nodeDBs as unknown as Map<number, NodeDBData>
            ).entries()) {
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
            draft.nodeDBs = rebuilt;
          }),
        );
      },
    },
  ),
);
