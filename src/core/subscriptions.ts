import { toast } from "react-hot-toast";

import type { Device } from "@core/stores/deviceStore.js";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";

export const subscribeAll = (
  device: Device,
  connection: Types.ConnectionType
) => {
  let myNodeNum = 0;

  // onLogEvent
  // onMeshHeartbeat

  connection.onDeviceMetadataPacket.subscribe((metadataPacket) => {
    device.addDeviceMetadataMessage(metadataPacket);
  });

  connection.onRoutingPacket.subscribe((routingPacket) => {
    switch (routingPacket.data.variant.oneofKind) {
      case "errorReason":
        if (
          routingPacket.data.variant.errorReason === Protobuf.Routing_Error.NONE
        ) {
          return;
        }
        toast.error(
          `Routing error: ${
            Protobuf.Routing_Error[routingPacket.data.variant.errorReason]
          }`,
          {
            icon: "❌"
          }
        );
        break;
      case "routeReply":
        toast(`Route Reply: ${routingPacket.data.variant.routeReply}`, {
          icon: "✅"
        });
        break;
      case "routeRequest":
        toast(`Route Request: ${routingPacket.data.variant.routeRequest}`, {
          icon: "✅"
        });
        break;
    }
  });

  connection.onTelemetryPacket.subscribe((telemetryPacket) => {
    device.setMetrics(telemetryPacket);
  });

  connection.onDeviceStatus.subscribe((status) => {
    device.setStatus(status);

    if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
      // device.setReady(true);
    } else if (status === Types.DeviceStatusEnum.DEVICE_DISCONNECTED) {
      device.setReady(false);
    }
  });

  connection.onWaypointPacket.subscribe((waypoint) => {
    const { data, ...rest } = waypoint;
    device.addWaypoint(data);
    device.addWaypointMessage({
      waypointID: data.id,
      ack: rest.packet.from !== myNodeNum,
      ...rest
    });
  });

  connection.onMyNodeInfo.subscribe((nodeInfo) => {
    device.setHardware(nodeInfo);
    myNodeNum = nodeInfo.myNodeNum;
  });

  connection.onUserPacket.subscribe((user) => {
    device.addUser(user);
  });

  connection.onPositionPacket.subscribe((position) => {
    device.addPosition(position);
  });

  connection.onNodeInfoPacket.subscribe((nodeInfo) => {
    toast(`New Node Discovered: ${nodeInfo.data.user?.shortName ?? "UNK"}`, {
      icon: "🔎"
    });
    device.addNodeInfo(nodeInfo);
  });

  connection.onChannelPacket.subscribe((channel) => {
    device.addChannel({
      config: channel.data,
      lastInterraction: new Date(),
      messages: []
    });
  });
  connection.onConfigPacket.subscribe((config) => {
    device.setConfig(config.data);
  });
  connection.onModuleConfigPacket.subscribe((moduleConfig) => {
    device.setModuleConfig(moduleConfig.data);
  });

  connection.onMessagePacket.subscribe((messagePacket) => {
    device.addMessage({
      ...messagePacket,
      ack: messagePacket.packet.from !== myNodeNum
    });
  });

  connection.onPendingSettingsChange.subscribe((state) => {
    device.setPendingSettingsChanges(state);
  });
};
