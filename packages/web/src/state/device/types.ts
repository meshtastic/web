import type { Protobuf } from "@meshtastic/core";
import type {
  ValidConfigType,
  ValidModuleConfigType,
} from "@features/settings/components/types.ts";

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
  ValidConfigType,
  ValidModuleConfigType,
  WaypointWithMetadata,
};
