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
  channels: new Map(),
  config: {} as Protobuf.LocalOnly.LocalConfig,
  moduleConfig: {} as Protobuf.LocalOnly.LocalModuleConfig,
  workingConfig: [],
  workingModuleConfig: [],
  hardware: {} as Protobuf.Mesh.MyNodeInfo,
  metadata: new Map(),
  traceroutes: new Map(),
  connection: undefined,
  activeNode: 0,
  waypoints: [],
  pendingSettingsChanges: false,
  messageDraft: "",
  unreadCounts: new Map(),
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
  },
  clientNotifications: [],

  setStatus: vi.fn(),
  setConfig: vi.fn(),
  setModuleConfig: vi.fn(),
  setWorkingConfig: vi.fn(),
  setWorkingModuleConfig: vi.fn(),
  getWorkingConfig: vi.fn(),
  getWorkingModuleConfig: vi.fn(),
  removeWorkingConfig: vi.fn(),
  removeWorkingModuleConfig: vi.fn(),
  getEffectiveConfig: vi.fn(),
  getEffectiveModuleConfig: vi.fn(),
  setHardware: vi.fn(),
  setActiveNode: vi.fn(),
  setPendingSettingsChanges: vi.fn(),
  addChannel: vi.fn(),
  addWaypoint: vi.fn(),
  addConnection: vi.fn(),
  addTraceRoute: vi.fn(),
  addMetadata: vi.fn(),
  setDialogOpen: vi.fn(),
  getDialogOpen: vi.fn().mockReturnValue(false),
  setMessageDraft: vi.fn(),
  incrementUnread: vi.fn(),
  resetUnread: vi.fn(),
  sendAdminMessage: vi.fn(),
  addClientNotification: vi.fn(),
  removeClientNotification: vi.fn(),
  getClientNotification: vi.fn(),
  getAllUnreadCount: vi.fn().mockReturnValue(0),
  getUnreadCount: vi.fn().mockReturnValue(0),
};
