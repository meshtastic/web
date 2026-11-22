import type { Protobuf } from "@core/protobuf.ts";

type ValidConfigType = Exclude<
  keyof Protobuf.LocalOnly.LocalConfig,
  "version" | "$typeName"
>;
type ValidModuleConfigType = Exclude<
  keyof Protobuf.LocalOnly.LocalModuleConfig,
  "version" | "$typeName"
>;

interface Dialogs {
  import: boolean;
  QR: boolean;
  shutdown: boolean;
  reboot: boolean;
  deviceName: boolean;
  nodeRemoval: boolean;
  nodeDetails: boolean;
  unsafeRoles: boolean;
  refreshKeys: boolean;
  deleteMessages: boolean;
  managedMode: boolean;
  clientNotification: boolean;
  resetNodeDb: boolean;
  clearAllStores: boolean;
  factoryResetDevice: boolean;
  factoryResetConfig: boolean;
}

type DialogVariant = keyof Dialogs;

type Page = "messages" | "map" | "settings" | "channels" | "nodes";

export type ConnectionId = number;
export type ConnectionType = "http" | "bluetooth" | "serial";
export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "disconnecting"
  | "configuring"
  | "configured"
  | "online"
  | "error";

export type Connection = {
  id: ConnectionId;
  type: ConnectionType;
  name: string;
  createdAt: number;
  lastConnectedAt?: number;
  isDefault?: boolean;
  status: ConnectionStatus;
  error?: string;
  errorKind?: "cert" | "network" | "lna-denied";
  /** The SDK's current reconnect attempt, while it is reconnecting. */
  reconnect?: { attempt: number; maxAttempts: number };
  meshDeviceId?: number;
  /**
   * Node number of the radio this connection last reached, from the
   * handshake's my_info. Message, node and telemetry history is stored per
   * node, so every connection to the same radio shares it.
   */
  nodeNum?: number;
  /**
   * The radio's own name (long name, else short name) as last seen on this
   * connection, so a reconnect can name the radio rather than the transport.
   */
  radioName?: string;
  /**
   * Set while the connect attempt that created this entry is unfinished;
   * cleared once it reaches a radio. Entries still pending at startup are
   * dropped (see core/connections/status.ts).
   */
  pending?: boolean;
} & NewConnection;

export type NewConnection =
  | { type: "http"; name: string; url: string }
  | {
      type: "bluetooth";
      name: string;
      deviceId?: string;
      deviceName?: string;
      gattServiceUUID?: string;
    }
  | {
      type: "serial";
      name: string;
      usbVendorId?: number;
      usbProductId?: number;
    };

type WaypointWithMetadata = Protobuf.Mesh.Waypoint & {
  metadata: {
    channel: number; // Channel on which the waypoint was received
    created: Date; // Timestamp when the waypoint was received
    updated?: Date; // Timestamp when the waypoint was last updated
    from: number; // Node number of the device that sent the waypoint
  };
};

export type {
  Page,
  Dialogs,
  DialogVariant,
  ValidConfigType,
  ValidModuleConfigType,
  WaypointWithMetadata,
};
