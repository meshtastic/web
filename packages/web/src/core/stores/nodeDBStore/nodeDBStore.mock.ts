import { vi } from "vitest";
import type { NodeDB } from "./index.ts";

/**
 * You can spread this base mock in your tests and override only the
 * properties relevant to a specific test case.
 */
export const mockNodeDBStore: NodeDB = {
  id: 0,
  myNodeNum: 0,
  nodeErrors: new Map(),
  nodeMap: new Map(),

  addNode: vi.fn(),
  addUser: vi.fn(),
  addPosition: vi.fn(),
  removeNode: vi.fn(),
  processPacket: vi.fn(),
  setNodeError: vi.fn(),
  clearNodeError: vi.fn(),
  getNodeError: vi.fn().mockReturnValue(undefined),
  hasNodeError: vi.fn().mockReturnValue(false),
  getNodes: vi.fn().mockReturnValue([]),
  getNodesLength: vi.fn().mockReturnValue(0),
  getNode: vi.fn().mockReturnValue(undefined),
  getMyNode: vi.fn(),
  updateFavorite: vi.fn(),
  updateIgnore: vi.fn(),
  setNodeNum: vi.fn(),
  removeAllNodeErrors: vi.fn(),
  removeAllNodes: vi.fn(),
};
