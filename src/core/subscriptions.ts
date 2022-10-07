import toast from "react-hot-toast";

import type { Device } from "@core/stores/deviceStore.js";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";

export const subscribeAll = (
  device: Device,
  connection: Types.ConnectionType
) => {
  connection.setLogLevel(Protobuf.LogRecord_Level.TRACE);

  // onLogEvent
  // onMeshHeartbeat

  connection.onRoutingPacket.subscribe((routingPacket) => {
    console.log(routingPacket);
  });

  connection.onTelemetryPacket.subscribe((telemetryPacket) => {
    console.log(telemetryPacket.data.variant);

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
      ack: rest.packet.from !== device.hardware.myNodeNum,
      ...rest,
    });
  });

  connection.onMyNodeInfo.subscribe((nodeInfo) => {
    device.setHardware(nodeInfo);
  });

  connection.onUserPacket.subscribe((user) => {
    device.addUser(user);
  });

  connection.onPositionPacket.subscribe((position) => {
    device.addPosition(position);
  });

  connection.onNodeInfoPacket.subscribe((nodeInfo) => {
    toast(`New Node Discovered: ${nodeInfo.data.user?.shortName ?? "UNK"}`, {
      icon: "🔎",
    });
    device.addNodeInfo(nodeInfo);
  });

  connection.onChannelPacket.subscribe((channel) => {
    device.addChannel({
      config: channel.data,
      lastInterraction: new Date(),
      messages: [],
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
      ack: messagePacket.packet.from !== device.hardware.myNodeNum,
    });
  });
};
