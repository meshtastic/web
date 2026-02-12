import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";
import { vi } from "vitest";
import type { Device } from "./index.ts";

/**
 * You can spread this base mock in your tests and override only the
 * properties relevant to a specific test case.
 *
 * @example
 * vi.mocked(useDevice).mockReturnValue({
 * ...mockDeviceStore,
 * getNode: (nodeNum) => mockNodes.get(nodeNum),
 * });
 */
export const mockDeviceStore: Device = {
  id: 0,
  config: create(Protobuf.LocalOnly.LocalConfigSchema),
  moduleConfig: create(Protobuf.LocalOnly.LocalModuleConfigSchema),
  queuedAdminMessages: [],
  hardware: {} as Protobuf.Mesh.MyNodeInfo,
  metadata: new Map(),
  traceroutes: new Map(),
  connection: undefined,
  waypoints: [],
  pendingSettingsChanges: false,
  clientNotifications: [],
  neighborInfo: new Map(),
  configProgress: {
    receivedConfigs: new Set(),
    total: 24,
    phase: "initializing",
    lastReceivedConfig: null,
  },

  // Config caching state
  isCachedConfig: false,
  configConflicts: new Map(),

  // Remote administration state
  remoteAdminTargetNode: null,
  remoteAdminAuthorized: true,
  recentlyConnectedNodes: [],

  setConnectionId: vi.fn(),
  setConfig: vi.fn(),
  setModuleConfig: vi.fn(),
  setHardware: vi.fn(),
  setPendingSettingsChanges: vi.fn(),
  addChannel: vi.fn(),
  addWaypoint: vi.fn(),
  removeWaypoint: vi.fn(),
  getWaypoint: vi.fn(),
  addTraceRoute: vi.fn(),
  addMetadata: vi.fn(),
  sendAdminMessage: vi.fn(),
  addClientNotification: vi.fn(),
  removeClientNotification: vi.fn(),
  getClientNotification: vi.fn(),
  getNeighborInfo: vi.fn(),
  addNeighborInfo: vi.fn(),
  getMyNodeNum: vi.fn().mockReturnValue(123456),
  resetConfigProgress: vi.fn(),
  setConnectionPhase: vi.fn(),

  // Admin message queue methods
  queueAdminMessage: vi.fn(),
  getAllQueuedAdminMessages: vi.fn().mockReturnValue([]),
  getAdminMessageChangeCount: vi.fn().mockReturnValue(0),
  clearQueuedAdminMessages: vi.fn(),

  // Config caching methods
  setCachedConfig: vi.fn(),
  setIsCachedConfig: vi.fn(),
  setConfigConflict: vi.fn(),
  hasAnyConflicts: vi.fn().mockReturnValue(false),
  getConfigConflict: vi.fn(),
  clearConfigConflicts: vi.fn(),

  // Remote administration methods
  setRemoteAdminTarget: vi.fn(),
  getAdminDestination: vi.fn().mockReturnValue("self"),
};
