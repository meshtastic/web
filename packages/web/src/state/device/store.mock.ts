import type { Protobuf } from "@meshtastic/core";
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
  status: 5 as const,
  config: {} as Protobuf.LocalOnly.LocalConfig,
  moduleConfig: {} as Protobuf.LocalOnly.LocalModuleConfig,
  changes: new Map(),
  queuedAdminMessages: [],
  hardware: {} as Protobuf.Mesh.MyNodeInfo,
  metadata: new Map(),
  traceroutes: new Map(),
  connection: undefined,
  waypoints: [],
  pendingSettingsChanges: false,
  dialog: {
    import: false,
    QR: false,
    shutdown: false,
    reboot: false,
    deviceName: false,
    deviceShare: false,
    nodeRemoval: false,
    pkiBackup: false,
    nodeDetails: false,
    unsafeRoles: false,
    refreshKeys: false,
    deleteMessages: false,
    managedMode: false,
    clientNotification: false,
    resetNodeDb: false,
    factoryResetConfig: false,
    factoryResetDevice: false,
    tracerouteResponse: false,
  },
  clientNotifications: [],
  neighborInfo: new Map(),
  configProgress: {
    receivedConfigs: new Set(),
    total: 21,
  },

  // Config caching state
  isCachedConfig: false,
  configConflicts: new Map(),

  // Remote administration state
  remoteAdminTargetNode: null,
  remoteAdminAuthorized: true,
  recentlyConnectedNodes: [],

  setStatus: vi.fn(),
  setConnectionId: vi.fn(),
  setConfig: vi.fn(),
  setModuleConfig: vi.fn(),
  getEffectiveConfig: vi.fn(),
  getEffectiveModuleConfig: vi.fn(),
  setHardware: vi.fn(),
  setPendingSettingsChanges: vi.fn(),
  addChannel: vi.fn(),
  addWaypoint: vi.fn(),
  removeWaypoint: vi.fn(),
  getWaypoint: vi.fn(),
  addTraceRoute: vi.fn(),
  addMetadata: vi.fn(),
  setDialogOpen: vi.fn(),
  getDialogOpen: vi.fn().mockReturnValue(false),
  sendAdminMessage: vi.fn(),
  addClientNotification: vi.fn(),
  removeClientNotification: vi.fn(),
  getClientNotification: vi.fn(),
  getNeighborInfo: vi.fn(),
  addNeighborInfo: vi.fn(),
  getMyNodeNum: vi.fn().mockReturnValue(123456),
  resetConfigProgress: vi.fn(),

  // Change tracking methods
  setChange: vi.fn(),
  clearAllChanges: vi.fn(),
  hasConfigChange: vi.fn().mockReturnValue(false),
  hasModuleConfigChange: vi.fn().mockReturnValue(false),
  hasChannelChange: vi.fn().mockReturnValue(false),
  hasUserChange: vi.fn().mockReturnValue(false),
  getConfigChangeCount: vi.fn().mockReturnValue(0),
  getModuleConfigChangeCount: vi.fn().mockReturnValue(0),
  getChannelChangeCount: vi.fn().mockReturnValue(0),
  getAllConfigChanges: vi.fn().mockReturnValue([]),
  getAllModuleConfigChanges: vi.fn().mockReturnValue([]),
  getAllChannelChanges: vi.fn().mockReturnValue([]),
  queueAdminMessage: vi.fn(),
  getAllQueuedAdminMessages: vi.fn().mockReturnValue([]),
  getAdminMessageChangeCount: vi.fn().mockReturnValue(0),

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
