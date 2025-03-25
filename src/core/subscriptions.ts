import type { Device } from "@core/stores/deviceStore.ts";
import { MeshDevice, Protobuf } from "@meshtastic/core";
import type { MessageStore } from "@core/stores/messageStore.ts";
import PacketToMessageDTO from "@core/dto/PacketToMessageDTO.ts";

export const subscribeAll = (
  device: Device,
  connection: MeshDevice,
  messageStore: MessageStore
) => {
  let myNodeNum = 0;

  // onLogEvent
  // onMeshHeartbeat

  connection.events.onDeviceMetadataPacket.subscribe((metadataPacket) => {
    device.addMetadata(metadataPacket.from, metadataPacket.data);
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    console.log("Routing Packet", routingPacket);

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

  connection.events.onTelemetryPacket.subscribe(() => {
    // device.setMetrics(telemetryPacket);
  });

  connection.events.onDeviceStatus.subscribe((status) => {
    device.setStatus(status);
  });

  connection.events.onWaypointPacket.subscribe((waypoint) => {
    const { data } = waypoint;
    device.addWaypoint(data);
  });

  connection.events.onMyNodeInfo.subscribe((nodeInfo) => {
    device.setHardware(nodeInfo);
    messageStore.setNodeNum(nodeInfo.myNodeNum);
    myNodeNum = nodeInfo.myNodeNum;
  });

  connection.events.onUserPacket.subscribe((user) => {
    device.addUser(user);
  });

  connection.events.onPositionPacket.subscribe((position) => {
    device.addPosition(position);
  });

  connection.events.onNodeInfoPacket.subscribe((nodeInfo) => {
    // toast(`New Node Discovered: ${nodeInfo.user?.shortName ?? "UNK"}`, {
    //   icon: "🔎"
    // });
    device.addNodeInfo(nodeInfo);
  });

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
    console.log("before Message Packet", messagePacket);

    // incoming and outgoing messages are handled by this event listener
    const dto = new PacketToMessageDTO(messagePacket, myNodeNum);
    const message = dto.toMessage();
    console.log("after Message Packet", message);
    messageStore.saveMessage(message);
  });

  connection.events.onTraceRoutePacket.subscribe((traceRoutePacket) => {
    device.addTraceRoute({
      ...traceRoutePacket,
    });
  });

  connection.events.onPendingSettingsChange.subscribe((state) => {
    device.setPendingSettingsChanges(state);
  });

  connection.events.onMeshPacket.subscribe((meshPacket) => {
    device.processPacket({
      from: meshPacket.from,
      snr: meshPacket.rxSnr,
      time: meshPacket.rxTime,
    });
  });


  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    if (routingPacket.data.variant.case === "errorReason") {
      switch (routingPacket.data.variant.value) {
        case Protobuf.Mesh.Routing_Error.NO_CHANNEL:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          device.setNodeError(routingPacket.from, Protobuf.Mesh.Routing_Error[routingPacket?.data?.variant?.value]);
          device.setDialogOpen("refreshKeys", true);
          break;
        case Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          device.setNodeError(routingPacket.from, Protobuf.Mesh.Routing_Error[routingPacket?.data?.variant?.value]);
          device.setDialogOpen("refreshKeys", true);
          break;
        default: {
          break;
        }
      }

    }
  });
};
