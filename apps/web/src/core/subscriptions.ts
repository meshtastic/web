import { useNewNodeNum } from "@core/hooks/useNewNodeNum";
import { type Device } from "@core/stores";
import { type MeshDevice, Protobuf } from "@meshtastic/sdk";

/**
 * Wires up the legacy MeshDevice event stream into the web's Zustand stores.
 *
 * Note: the SDK now owns chat persistence (via SqlocalMessageRepository) and
 * the entire NodesClient surface — node info, user, position, lastHeard /
 * snr, favourite / ignored flags, and PKI-error tracking. This handler no
 * longer mirrors any of that into the legacy stores; what remains is
 * device-store-only state (waypoints, traceroutes, neighbour info, dialog
 * open triggers, unread counts).
 */
export const subscribeAll = (device: Device, connection: MeshDevice) => {
  connection.events.onDeviceMetadataPacket.subscribe((metadataPacket) => {
    device.addMetadata(metadataPacket.from, metadataPacket.data);
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    switch (routingPacket.data.variant.case) {
      case "errorReason": {
        if (
          routingPacket.data.variant.value === Protobuf.Mesh.Routing_Error.NONE
        ) {
          return;
        }
        console.info(`Routing Error: ${routingPacket.data.variant.value}`);
        break;
      }
      case "routeReply": {
        console.info(`Route Reply: ${routingPacket.data.variant.value}`);
        break;
      }
      case "routeRequest": {
        console.info(`Route Request: ${routingPacket.data.variant.value}`);
        break;
      }
    }
  });

  connection.events.onDeviceStatus.subscribe((status) => {
    device.setStatus(status);
  });

  connection.events.onWaypointPacket.subscribe((waypoint) => {
    const { data, channel, from, rxTime } = waypoint;
    device.addWaypoint(data, channel, from, rxTime);
  });

  connection.events.onMyNodeInfo.subscribe((nodeInfo) => {
    useNewNodeNum(device.id, nodeInfo);
  });

  // onUserPacket / onPositionPacket / onNodeInfoPacket and device-metrics
  // telemetry (battery / channel utilisation / voltage) are folded into nodes by
  // the SDK NodesClient (see packages/sdk/src/features/nodes/NodesClient.ts).

  connection.events.onChannelPacket.subscribe((channel) => {
    device.addChannel(channel);
  });
  connection.events.onConfigPacket.subscribe((config) => {
    device.setConfig(config);
  });
  connection.events.onModuleConfigPacket.subscribe((moduleConfig) => {
    device.setModuleConfig(moduleConfig);
  });

  // Inbound message handling (persistence, unread counts) lives entirely on
  // the SDK ChatClient now — see ChatClient + chat.unread.

  connection.events.onTraceRoutePacket.subscribe((traceRoutePacket) => {
    device.addTraceRoute({
      ...traceRoutePacket,
    });
  });

  connection.events.onPendingSettingsChange.subscribe((state) => {
    device.setPendingSettingsChanges(state);
  });

  // onMeshPacket → lastHeard / snr per-node updates are handled by the SDK
  // NodesClient.

  connection.events.onClientNotificationPacket.subscribe(
    (clientNotificationPacket) => {
      device.addClientNotification(clientNotificationPacket);
      device.setDialogOpen("clientNotification", true);
    },
  );

  connection.events.onNeighborInfoPacket.subscribe((neighborInfo) => {
    device.addNeighborInfo(neighborInfo.from, neighborInfo.data);
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    if (routingPacket.data.variant.case === "errorReason") {
      switch (routingPacket.data.variant.value) {
        case Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          break;
        case Protobuf.Mesh.Routing_Error.NO_CHANNEL:
        case Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          // Per-node error tracking lives on the SDK NodesClient
          // (client.nodes.errors); the dialog open trigger stays here so the
          // legacy device-store-driven dialog manager keeps working.
          device.setDialogOpen("refreshKeys", true);
          break;
        default:
          break;
      }
    }
  });
};
