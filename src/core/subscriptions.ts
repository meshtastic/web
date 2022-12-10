import { toast } from "react-hot-toast";

import type { Device } from "@core/stores/deviceStore.js";
import { Types } from "@meshtastic/meshtasticjs";

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
    console.log(routingPacket);
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
    console.log("^^^^^^^ GOT MY NODE INFO");

    device.setHardware(nodeInfo);
    myNodeNum = nodeInfo.myNodeNum;
  });

  connection.onUserPacket.subscribe((user) => {
    console.log("^^^^^^^ GOT USER");
    device.addUser(user);
  });

  connection.onPositionPacket.subscribe((position) => {
    console.log("^^^^^^^ GOT POSITION");
    device.addPosition(position);
  });

  connection.onNodeInfoPacket.subscribe((nodeInfo) => {
    console.log("^^^^^^^ GOT NODE INFO");
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
};
