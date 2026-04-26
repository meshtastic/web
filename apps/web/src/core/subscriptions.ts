import { useNewNodeNum } from "@core/hooks/useNewNodeNum";
import { type Device, type MessageStore } from "@core/stores";
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
export const subscribeAll = (
  device: Device,
  connection: MeshDevice,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: kept for callsite stability while messageStore is being retired
  _messageStore: MessageStore,
) => {
  let myNodeNum = 0;

  connection.events.onDeviceMetadataPacket.subscribe((metadataPacket) => {
    device.addMetadata(metadataPacket.from, metadataPacket.data);
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    switch (routingPacket.data.variant.case) {
      case "errorReason": {
        if (routingPacket.data.variant.value === Protobuf.Mesh.Routing_Error.NONE) {
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

  connection.events.onTelemetryPacket.subscribe((telemetryPacket) => {
    // Fold live device-metrics telemetry into the node so battery / channel
    // utilisation / voltage stay current between NodeInfo broadcasts.
    if (telemetryPacket.data.variant.case === "deviceMetrics") {
      nodeDB.addDeviceMetrics({
        ...telemetryPacket,
        data: telemetryPacket.data.variant.value,
      });
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
    myNodeNum = nodeInfo.myNodeNum;
  });

  // onUserPacket / onPositionPacket / onNodeInfoPacket are handled by the
  // SDK NodesClient (see packages/sdk/src/features/nodes/NodesClient.ts).

  connection.events.onChannelPacket.subscribe((channel) => {
    device.addChannel(channel);
  });
  connection.events.onConfigPacket.subscribe((config) => {
    device.setConfig(config);
  });
  connection.events.onModuleConfigPacket.subscribe((moduleConfig) => {
    device.setModuleConfig(moduleConfig);
  });

  connection.events.onMessagePacket.subscribe((messagePacket) => {
    // Message persistence is handled by the SDK chat slice via the
    // SqlocalMessageRepository wired in useConnections. This handler exists
    // only to drive the legacy unread-count tracking on the device store.
    const isDirect = messagePacket.type === "direct";
    if (isDirect) {
      if (messagePacket.to === myNodeNum) {
        device.incrementUnread(messagePacket.from);
      }
    } else if (messagePacket.from !== myNodeNum) {
      device.incrementUnread(messagePacket.channel);
    }
  });

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

  connection.events.onClientNotificationPacket.subscribe((clientNotificationPacket) => {
    device.addClientNotification(clientNotificationPacket);
    device.setDialogOpen("clientNotification", true);
  });

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
