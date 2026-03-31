import PacketToMessageDTO from "@core/dto/PacketToMessageDTO.ts";
import { useNewNodeNum } from "@core/hooks/useNewNodeNum";
import { type Device, type MessageStore, MessageType, type NodeDB } from "@core/stores";
import { logEvent } from "@core/stores/logStore/index.ts";
import { type MeshDevice, Protobuf } from "@meshtastic/core";

function nodeHex(num: number): string {
  return `!${num.toString(16).padStart(8, "0")}`;
}

export const subscribeAll = (
  device: Device,
  connection: MeshDevice,
  messageStore: MessageStore,
  nodeDB: NodeDB,
) => {
  let myNodeNum = 0;

  connection.events.onDeviceMetadataPacket.subscribe((metadataPacket) => {
    device.addMetadata(metadataPacket.from, metadataPacket.data);
    const fw = metadataPacket.data.firmwareVersion ?? "?";
    const hw = metadataPacket.data.hwModel ?? "?";
    logEvent("debug", "DeviceMetadata", `from ${nodeHex(metadataPacket.from)} fw:${fw} hw:${hw}`);
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
    const from = nodeHex(telemetryPacket.from);
    const variant = telemetryPacket.data.variant.case ?? "unknown";
    logEvent("debug", "Telemetry", `from ${from} type:${variant}`);
  });

  connection.events.onDeviceStatus.subscribe((status) => {
    device.setStatus(status);
    logEvent("info", "DeviceStatus", String(status));
  });

  connection.events.onWaypointPacket.subscribe((waypoint) => {
    const { data, channel, from, rxTime } = waypoint;
    device.addWaypoint(data, channel, from, rxTime);
    logEvent("info", "Waypoint", `from ${nodeHex(from)} ch:${channel} name:"${data.name}"`);
  });

  connection.events.onMyNodeInfo.subscribe((nodeInfo) => {
    useNewNodeNum(device.id, nodeInfo);
    myNodeNum = nodeInfo.myNodeNum;
    logEvent("info", "MyNodeInfo", `myNodeNum:${nodeHex(nodeInfo.myNodeNum)}`);
  });

  connection.events.onUserPacket.subscribe((user) => {
    nodeDB.addUser(user);
    const longName = user.data.longName ?? "?";
    const shortName = user.data.shortName ?? "?";
    logEvent(
      "debug",
      "User",
      `from ${nodeHex(user.from)} longName:"${longName}" shortName:"${shortName}"`,
    );
  });

  connection.events.onPositionPacket.subscribe((position) => {
    nodeDB.addPosition(position);
    const lat = ((position.data.latitudeI ?? 0) / 1e7).toFixed(5);
    const lon = ((position.data.longitudeI ?? 0) / 1e7).toFixed(5);
    logEvent("debug", "Position", `from ${nodeHex(position.from)} lat:${lat} lon:${lon}`);
  });

  // NOTE: Node handling is managed by the nodeDB
  // Nodes are added via subscriptions.ts and stored in nodeDB
  // Configuration is handled directly by meshDevice.configure() in useConnections
  connection.events.onNodeInfoPacket.subscribe((nodeInfo) => {
    nodeDB.addNode(nodeInfo);
    logEvent("debug", "NodeInfo", `from ${nodeHex(nodeInfo.from)} num:${nodeHex(nodeInfo.data.num ?? 0)}`);
  });

  connection.events.onChannelPacket.subscribe((channel) => {
    device.addChannel(channel);
    logEvent(
      "debug",
      "Channel",
      `index:${channel.data.index} name:"${channel.data.settings?.name ?? ""}" role:${channel.data.role}`,
    );
  });

  connection.events.onConfigPacket.subscribe((config) => {
    device.setConfig(config);
    logEvent("debug", "Config", `type:${config.data.payloadVariant.case ?? "unknown"}`);
  });

  connection.events.onModuleConfigPacket.subscribe((moduleConfig) => {
    device.setModuleConfig(moduleConfig);
    logEvent(
      "debug",
      "ModuleConfig",
      `type:${moduleConfig.data.payloadVariant.case ?? "unknown"}`,
    );
  });

  connection.events.onMessagePacket.subscribe((messagePacket) => {
    // incoming and outgoing messages are handled by this event listener
    const dto = new PacketToMessageDTO(messagePacket, myNodeNum);
    const message = dto.toMessage();
    messageStore.saveMessage(message);

    if (message.type === MessageType.Direct) {
      if (message.to === myNodeNum) {
        device.incrementUnread(messagePacket.from);
      }
    } else if (message.type === MessageType.Broadcast) {
      if (message.from !== myNodeNum) {
        device.incrementUnread(message.channel);
      }
    }

    const dir = messagePacket.from === myNodeNum ? "sent" : "recv";
    const channel =
      message.type === MessageType.Direct
        ? `DM→${nodeHex(message.to)}`
        : `ch${message.channel}`;
    logEvent("info", "Message", `[${dir}] ${channel} from ${nodeHex(messagePacket.from)}`);
  });

  connection.events.onTraceRoutePacket.subscribe((traceRoutePacket) => {
    device.addTraceRoute({
      ...traceRoutePacket,
    });
    const hops = traceRoutePacket.data.route?.length ?? 0;
    logEvent(
      "info",
      "TraceRoute",
      `from ${nodeHex(traceRoutePacket.from)} to ${nodeHex(traceRoutePacket.to)} hops:${hops}`,
    );
  });

  connection.events.onPendingSettingsChange.subscribe((state) => {
    device.setPendingSettingsChanges(state);
  });

  connection.events.onMeshPacket.subscribe((meshPacket) => {
    nodeDB.processPacket({
      from: meshPacket.from,
      snr: meshPacket.rxSnr,
      time: meshPacket.rxTime,
    });
    const snr = meshPacket.rxSnr !== undefined ? ` snr:${meshPacket.rxSnr.toFixed(1)}` : "";
    logEvent(
      "debug",
      "MeshPacket",
      `from ${nodeHex(meshPacket.from)} id:${meshPacket.id}${snr}`,
    );
  });

  connection.events.onClientNotificationPacket.subscribe((clientNotificationPacket) => {
    device.addClientNotification(clientNotificationPacket);
    device.setDialogOpen("clientNotification", true);
    logEvent(
      "warn",
      "ClientNotification",
      clientNotificationPacket.data.message ?? "(no message)",
    );
  });

  connection.events.onNeighborInfoPacket.subscribe((neighborInfo) => {
    device.addNeighborInfo(neighborInfo.from, neighborInfo.data);
    const count = neighborInfo.data.neighbors?.length ?? 0;
    logEvent("debug", "NeighborInfo", `from ${nodeHex(neighborInfo.from)} neighbors:${count}`);
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    if (routingPacket.data.variant.case === "errorReason") {
      switch (routingPacket.data.variant.value) {
        case Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          logEvent(
            "error",
            "RoutingError",
            `MAX_RETRANSMIT from ${nodeHex(routingPacket.from)}`,
          );
          break;
        case Protobuf.Mesh.Routing_Error.NO_CHANNEL:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          nodeDB.setNodeError(routingPacket.from, routingPacket?.data?.variant?.value);
          device.setDialogOpen("refreshKeys", true);
          logEvent(
            "error",
            "RoutingError",
            `NO_CHANNEL from ${nodeHex(routingPacket.from)}`,
          );
          break;
        case Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          nodeDB.setNodeError(routingPacket.from, routingPacket?.data?.variant?.value);
          device.setDialogOpen("refreshKeys", true);
          logEvent(
            "error",
            "RoutingError",
            `PKI_UNKNOWN_PUBKEY from ${nodeHex(routingPacket.from)}`,
          );
          break;
        default: {
          break;
        }
      }
    }
  });
};
