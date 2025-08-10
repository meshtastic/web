import { createStorageWithMapSupport } from "@core/stores/utils/indexDB.ts";
import type { Protobuf } from "@meshtastic/core";
import { produce } from "immer";
import { create as createStore } from "zustand";
import { persist } from "zustand/middleware";
import type { NodeError } from "./types";

const CURRENT_STORE_VERSION = 0;

export interface nodeDB {
  userId: number;
  nodeMap: Map<number, Protobuf.Mesh.NodeInfo>;
  nodeErrors: Map<number, NodeError>;

  addNode: (nodeInfo: Protobuf.Mesh.NodeInfo) => void;
  removeNode: (nodeNum: number) => void;

  getNodesLength: () => number;
  getNode: (nodeNum: number) => Protobuf.Mesh.NodeInfo | undefined;
  getNodes: (
    filter?: (node: Protobuf.Mesh.NodeInfo) => boolean,
  ) => Protobuf.Mesh.NodeInfo[];

  setNodeError: (nodeNum: number, error: string) => void;
  clearNodeError: (nodeNum: number) => void;
  getNodeError: (nodeNum: number) => NodeError | undefined;
  hasNodeError: (nodeNum: number) => boolean;
}

export interface nodeDBState {
  addNodeDB: (id: number) => nodeDB;
  removeNodeDB: (id: number) => void;
  getNodeDBs: () => nodeDB[];
  getNodeDB: (id: number) => nodeDB | undefined;
}

interface PrivateNodeDBState extends nodeDBState {
  nodeDBs: Map<number, nodeDB>;
}

type NodeDBPersisted = Pick<PrivateNodeDBState, "nodeDBs">;

export const useNodeDBStore = createStore<PrivateNodeDBState>()(
  persist(
    (set, get) => ({
      nodeDBs: new Map(),
      addNodeDB: (userId: number) => {
        set(
          produce<PrivateNodeDBState>((draft) => {
            draft.nodeDBs.set(userId, {
              userId: userId,
              nodeMap: new Map(),
              nodeErrors: new Map(),

              addNode: (node: Protobuf.Mesh.NodeInfo) =>
                set(
                  produce((draft: PrivateNodeDBState) => {
                    const nodeDB = draft.nodeDBs.get(userId);
                    if (!nodeDB) {
                      throw new Error(`NodeDB for userID ${userId} not found`);
                    }
                    nodeDB.nodeMap.set(node.num, node);
                  }),
                ),

              removeNode: (nodeNum: number) =>
                set(
                  produce((draft: PrivateNodeDBState) => {
                    const nodeDB = draft.nodeDBs.get(userId);
                    if (!nodeDB) {
                      throw new Error(`NodeDB for userID ${userId} not found`);
                    }
                    nodeDB.nodeMap.delete(nodeNum);
                  }),
                ),

              setNodeError: (nodeNum: number, error: string) =>
                set(
                  produce((draft: PrivateNodeDBState) => {
                    const nodeDB = draft.nodeDBs.get(userId);
                    if (!nodeDB) {
                      throw new Error(`NodeDB for userID ${userId} not found`);
                    }
                    nodeDB.nodeErrors.set(nodeNum, { node: nodeNum, error });
                  }),
                ),

              clearNodeError: (nodeNum: number) =>
                set(
                  produce((draft: PrivateNodeDBState) => {
                    const nodeDB = draft.nodeDBs.get(userId);
                    if (!nodeDB) {
                      throw new Error(`NodeDB for userID ${userId} not found`);
                    }
                    nodeDB.nodeErrors.delete(nodeNum);
                  }),
                ),

              getNodesLength: () => {
                const nodeDB = draft.nodeDBs.get(userId);
                if (!nodeDB) {
                  throw new Error(`NodeDB for userID ${userId} not found`);
                }
                return nodeDB.nodeMap.size;
              },

              getNode: (nodeNum: number) => {
                const nodeDB = draft.nodeDBs.get(userId);
                if (!nodeDB) {
                  throw new Error(`NodeDB for userID ${userId} not found`);
                }
                return nodeDB.nodeMap.get(nodeNum);
              },

              getNodes: (filter?) => {
                const nodeDB = draft.nodeDBs.get(userId);
                if (!nodeDB) {
                  throw new Error(`NodeDB for userID ${userId} not found`);
                }
                const allNodes = Array.from(nodeDB.nodeMap.values()).filter(
                  (node) => node.num !== nodeDB.userId,
                );
                if (filter) {
                  return allNodes.filter(filter);
                }
                return allNodes;
              },

              getNodeError: (nodeNum: number) => {
                const nodeDB = draft.nodeDBs.get(userId);
                if (!nodeDB) {
                  throw new Error(`NodeDB for userID ${userId} not found`);
                }
                return nodeDB.nodeErrors.get(nodeNum);
              },

              hasNodeError: (nodeNum: number) => {
                const nodeDB = draft.nodeDBs.get(userId);
                if (!nodeDB) {
                  throw new Error(`NodeDB for userID ${userId} not found`);
                }
                return nodeDB.nodeErrors.has(nodeNum) ?? false;
              },
            });
          }),
        );

        const nodeDB = get().nodeDBs.get(userId);

        if (!nodeDB) {
          throw new Error(
            `Failed to create or retrieve nodeDB for userID ${userId}`,
          );
        }
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
      getNodeDB: (userId) => get().nodeDBs.get(userId),
    }),
    {
      name: "meshtastic-nodedb-store",
      storage: createStorageWithMapSupport<NodeDBPersisted>(),
      version: CURRENT_STORE_VERSION,
      partialize: (s) => ({
        nodeDBs: s.nodeDBs,
      }),
    },
  ),
);
