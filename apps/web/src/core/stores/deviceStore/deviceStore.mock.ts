import type { Protobuf } from "@meshtastic/sdk";
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
  myNodeNum: 123456,
  status: 5 as const,
  channels: new Map(),
  config: {} as Protobuf.LocalOnly.LocalConfig,
  moduleConfig: {} as Protobuf.LocalOnly.LocalModuleConfig,
  hardware: {} as Protobuf.Mesh.MyNodeInfo,
  metadata: new Map(),
  traceroutes: new Map(),
  connection: undefined,
  activeNode: 0,
  waypoints: [],
  pendingSettingsChanges: false,
  messageDraft: "",
  dialog: {
    import: false,
    QR: false,
    shutdown: false,
    reboot: false,
    deviceName: false,
    nodeRemoval: false,
    pkiBackup: false,
    nodeDetails: false,
    unsafeRoles: false,
    refreshKeys: false,
    deleteMessages: false,
    managedMode: false,
    clientNotification: false,
    resetNodeDb: false,
    clearAllStores: false,
    factoryResetConfig: false,
    factoryResetDevice: false,
  },
  clientNotifications: [],
  neighborInfo: new Map(),

  setStatus: vi.fn(),
  setConfig: vi.fn(),
  setModuleConfig: vi.fn(),
  getEffectiveConfig: vi.fn(),
  getEffectiveModuleConfig: vi.fn(),
  setHardware: vi.fn(),
  setActiveNode: vi.fn(),
  setPendingSettingsChanges: vi.fn(),
  addChannel: vi.fn(),
  addWaypoint: vi.fn(),
  removeWaypoint: vi.fn(),
  getWaypoint: vi.fn(),
  addConnection: vi.fn(),
  addTraceRoute: vi.fn(),
  addMetadata: vi.fn(),
  setDialogOpen: vi.fn(),
  getDialogOpen: vi.fn().mockReturnValue(false),
  setMessageDraft: vi.fn(),
  sendAdminMessage: vi.fn(),
  addClientNotification: vi.fn(),
  removeClientNotification: vi.fn(),
  getClientNotification: vi.fn(),
  getNeighborInfo: vi.fn(),
  addNeighborInfo: vi.fn(),
};
