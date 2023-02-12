import type { Device } from "@core/stores/deviceStore.js";
import { Protobuf, Types } from "@meshtastic/meshtasticjs";

export const subscribeAll = (
  device: Device,
  connection: Types.ConnectionType
) => {
  let myNodeNum = 0;

  // onLogEvent
  // onMeshHeartbeat

  connection.events.onDeviceMetadataPacket.subscribe((metadataPacket) => {
    device.addDeviceMetadataMessage(metadataPacket);
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    switch (routingPacket.data.variant.case) {
      case "errorReason":
        if (routingPacket.data.variant.value === Protobuf.Routing_Error.NONE) {
          return;
        }
        console.log(`Routing Error: ${routingPacket.data.variant.value}`);
        break;
      case "routeReply":
        console.log(`Route Reply: ${routingPacket.data.variant.value}`);

        break;
      case "routeRequest":
        console.log(`Route Request: ${routingPacket.data.variant.value}`);

        break;
    }
  });

  connection.events.onTelemetryPacket.subscribe((telemetryPacket) => {
    device.setMetrics(telemetryPacket);
  });

  connection.events.onDeviceStatus.subscribe((status) => {
    device.setStatus(status);

    if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED) {
      // device.setReady(true);
    } else if (status === Types.DeviceStatusEnum.DEVICE_DISCONNECTED) {
      device.setReady(false);
    }
  });

  connection.events.onWaypointPacket.subscribe((waypoint) => {
    const { data, ...rest } = waypoint;
    device.addWaypoint(data);
    device.addWaypointMessage({
      waypointID: data.id,
      state: rest.from !== myNodeNum ? "ack" : "waiting",
      ...rest
    });
  });

  connection.events.onMyNodeInfo.subscribe((nodeInfo) => {
    device.setHardware(nodeInfo);
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
    device.addChannel({
      config: channel,
      lastInterraction: new Date(),
      messages: []
    });
  });
  connection.events.onConfigPacket.subscribe((config) => {
    device.setConfig(config);
  });
  connection.events.onModuleConfigPacket.subscribe((moduleConfig) => {
    device.setModuleConfig(moduleConfig);
  });

  connection.events.onMessagePacket.subscribe((messagePacket) => {
    device.addMessage({
      ...messagePacket,
      state: messagePacket.from !== myNodeNum ? "ack" : "waiting"
    });
  });

  connection.events.onPendingSettingsChange.subscribe((state) => {
    device.setPendingSettingsChanges(state);
  });

  connection.events.onMeshPacket.subscribe((meshPacket) => {
    device.processPacket({
      from: meshPacket.from,
      snr: meshPacket.rxSnr,
      time: meshPacket.rxTime
    });
  });
};
