import type { Protobuf } from "@meshtastic/core";
import type {
  ValidConfigType,
  ValidModuleConfigType,
} from "./changeRegistry.ts";

interface Dialogs {
  import: boolean;
  QR: boolean;
  shutdown: boolean;
  reboot: boolean;
  deviceName: boolean;
  nodeRemoval: boolean;
  pkiBackup: boolean;
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
