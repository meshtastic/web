import { useNewNodeNum } from "@core/hooks/useNewNodeNum";
import type { MeshSession } from "@core/kmp/session.ts";
import { type Device } from "@core/stores";
import { Protobuf } from "@core/protobuf.ts";

/**
 * Feeds a session's events into the web's device store: what the SDK and
 * the session don't keep themselves (waypoints, traceroutes, neighbour
 * info, dialog triggers, the config mirror the settings forms read).
 */
export const subscribeAll = (
  device: Device,
  session: MeshSession,
): (() => void) => {
  const { events } = session;
  const unsubscribes = [
    events.onDeviceMetadataPacket.subscribe(({ from, data }) => {
      device.addMetadata(from, data);
    }),
    events.onRoutingPacket.subscribe((packet) => {
      if (packet.data.variant.case !== "errorReason") return;
      switch (packet.data.variant.value) {
        case Protobuf.Mesh.Routing_Error.NONE:
          return;
        case Protobuf.Mesh.Routing_Error.NO_CHANNEL:
        case Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY:
          console.error(`Routing Error: ${packet.data.variant.value}`);
          device.setDialogOpen("refreshKeys", true);
          return;
        default:
          console.info(`Routing Error: ${packet.data.variant.value}`);
      }
    }),
    events.onDeviceStatus.subscribe((status) => {
      device.setStatus(status);
    }),
    events.onWaypointPacket.subscribe(({ data, channel, from, rxTime }) => {
      device.addWaypoint(data, channel, from, rxTime);
    }),
    events.onMyNodeInfo.subscribe((info) => {
      useNewNodeNum(device.id, info);
    }),
    events.onChannelPacket.subscribe((channel) => {
      device.addChannel(channel);
    }),
    events.onConfigPacket.subscribe((config) => {
      device.setConfig(config);
    }),
    events.onModuleConfigPacket.subscribe((moduleConfig) => {
      device.setModuleConfig(moduleConfig);
    }),
    events.onTraceRoutePacket.subscribe((packet) => {
      device.addTraceRoute(packet);
    }),
    events.onPendingSettingsChange.subscribe((pending) => {
      device.setPendingSettingsChanges(pending);
    }),
    events.onClientNotificationPacket.subscribe((notification) => {
      device.addClientNotification(notification);
      device.setDialogOpen("clientNotification", true);
    }),
    events.onNeighborInfoPacket.subscribe((packet) => {
      device.addNeighborInfo(packet.from, packet.data);
    }),
  ];
  return () => {
    for (const off of unsubscribes) off();
  };
};
