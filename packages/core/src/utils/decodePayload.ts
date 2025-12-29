import { fromBinary, toJson } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";

/**
 * Type for valid PortNum string names (excludes reverse numeric mappings)
 */
export type PortNumName = {
  [K in keyof typeof Protobuf.Portnums.PortNum]: typeof Protobuf.Portnums.PortNum[K] extends number
    ? K
    : never;
}[keyof typeof Protobuf.Portnums.PortNum];

/**
 * Strongly typed lookup map for O(1) string-to-number PortNum enum conversion.
 * Allows bracket notation: portNumMap["TEXT_MESSAGE_APP"] => 1
 */
export const portNumMap = Object.fromEntries(
  Object.entries(Protobuf.Portnums.PortNum).filter(
    (entry): entry is [PortNumName, number] => typeof entry[1] === "number",
  ),
) as { readonly [K in PortNumName]: typeof Protobuf.Portnums.PortNum[K] };

/**
 * Decode a mesh packet payload based on its port number.
 * Returns the decoded protobuf message or string, or null if decoding fails.
 */
export function decodePayload(
  portnum: number,
  payload: Uint8Array,
):
  | Protobuf.Mesh.Routing
  | Protobuf.Admin.AdminMessage
  | Protobuf.Mesh.Position
  | Protobuf.Mesh.User
  | Protobuf.Telemetry.Telemetry
  | Protobuf.Mesh.Waypoint
  | Protobuf.Mesh.RouteDiscovery
  | Protobuf.Mesh.NeighborInfo
  | Protobuf.StoreForward.StoreAndForward
  | Protobuf.PaxCount.Paxcount
  | Protobuf.RemoteHardware.HardwareMessage
  | string
  | null {
  try {
    switch (portnum) {
      case Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP:
      case Protobuf.Portnums.PortNum.TEXT_MESSAGE_COMPRESSED_APP:
        return new TextDecoder().decode(payload);

      case Protobuf.Portnums.PortNum.ROUTING_APP:
        return fromBinary(Protobuf.Mesh.RoutingSchema, payload);

      case Protobuf.Portnums.PortNum.ADMIN_APP:
        return fromBinary(Protobuf.Admin.AdminMessageSchema, payload);

      case Protobuf.Portnums.PortNum.POSITION_APP:
        return fromBinary(Protobuf.Mesh.PositionSchema, payload);

      case Protobuf.Portnums.PortNum.NODEINFO_APP:
        return fromBinary(Protobuf.Mesh.UserSchema, payload);

      case Protobuf.Portnums.PortNum.TELEMETRY_APP:
        return fromBinary(Protobuf.Telemetry.TelemetrySchema, payload);

      case Protobuf.Portnums.PortNum.WAYPOINT_APP:
        return fromBinary(Protobuf.Mesh.WaypointSchema, payload);

      case Protobuf.Portnums.PortNum.TRACEROUTE_APP:
        return fromBinary(Protobuf.Mesh.RouteDiscoverySchema, payload);

      case Protobuf.Portnums.PortNum.NEIGHBORINFO_APP:
        return fromBinary(Protobuf.Mesh.NeighborInfoSchema, payload);

      case Protobuf.Portnums.PortNum.STORE_FORWARD_APP:
        return fromBinary(Protobuf.StoreForward.StoreAndForwardSchema, payload);

      case Protobuf.Portnums.PortNum.PAXCOUNTER_APP:
        return fromBinary(Protobuf.PaxCount.PaxcountSchema, payload);

      case Protobuf.Portnums.PortNum.REMOTE_HARDWARE_APP:
        return fromBinary(
          Protobuf.RemoteHardware.HardwareMessageSchema,
          payload,
        );

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Decode a mesh packet payload and return as JSON for display.
 * Returns a JSON object or null if decoding fails or port is unsupported.
 */
export function decodePayloadToJson(
  portnum: number,
  payload: Uint8Array,
): Record<string, unknown> | null {
  try {
    switch (portnum) {
      case Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP:
      case Protobuf.Portnums.PortNum.TEXT_MESSAGE_COMPRESSED_APP:
        return { message: new TextDecoder().decode(payload) };

      case Protobuf.Portnums.PortNum.ROUTING_APP:
        return toJson(
          Protobuf.Mesh.RoutingSchema,
          fromBinary(Protobuf.Mesh.RoutingSchema, payload),
        );

      case Protobuf.Portnums.PortNum.ADMIN_APP:
        return toJson(
          Protobuf.Admin.AdminMessageSchema,
          fromBinary(Protobuf.Admin.AdminMessageSchema, payload),
        );

      case Protobuf.Portnums.PortNum.POSITION_APP:
        return toJson(
          Protobuf.Mesh.PositionSchema,
          fromBinary(Protobuf.Mesh.PositionSchema, payload),
        );

      case Protobuf.Portnums.PortNum.NODEINFO_APP:
        return toJson(
          Protobuf.Mesh.UserSchema,
          fromBinary(Protobuf.Mesh.UserSchema, payload),
        );

      case Protobuf.Portnums.PortNum.TELEMETRY_APP:
        return toJson(
          Protobuf.Telemetry.TelemetrySchema,
          fromBinary(Protobuf.Telemetry.TelemetrySchema, payload),
        );

      case Protobuf.Portnums.PortNum.WAYPOINT_APP:
        return toJson(
          Protobuf.Mesh.WaypointSchema,
          fromBinary(Protobuf.Mesh.WaypointSchema, payload),
        );

      case Protobuf.Portnums.PortNum.TRACEROUTE_APP:
        return toJson(
          Protobuf.Mesh.RouteDiscoverySchema,
          fromBinary(Protobuf.Mesh.RouteDiscoverySchema, payload),
        );

      case Protobuf.Portnums.PortNum.NEIGHBORINFO_APP:
        return toJson(
          Protobuf.Mesh.NeighborInfoSchema,
          fromBinary(Protobuf.Mesh.NeighborInfoSchema, payload),
        );

      case Protobuf.Portnums.PortNum.STORE_FORWARD_APP:
        return toJson(
          Protobuf.StoreForward.StoreAndForwardSchema,
          fromBinary(Protobuf.StoreForward.StoreAndForwardSchema, payload),
        );

      case Protobuf.Portnums.PortNum.PAXCOUNTER_APP:
        return toJson(
          Protobuf.PaxCount.PaxcountSchema,
          fromBinary(Protobuf.PaxCount.PaxcountSchema, payload),
        );

      case Protobuf.Portnums.PortNum.REMOTE_HARDWARE_APP:
        return toJson(
          Protobuf.RemoteHardware.HardwareMessageSchema,
          fromBinary(Protobuf.RemoteHardware.HardwareMessageSchema, payload),
        );

      default:
        return null;
    }
  } catch {
    return null;
  }
}
