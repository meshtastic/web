import PacketToMessageDTO from "@core/dto/PacketToMessageDTO.ts";
import { useNewNodeNum } from "@core/hooks/useNewNodeNum";
import {
  type Device,
  type MessageStore,
  MessageType,
  MessageState,
  type NodeDB,
} from "@core/stores";
import { type MeshDevice, Protobuf } from "@meshtastic/core";
export const subscribeAll = (
  device: Device,
  connection: MeshDevice,
  messageStore: MessageStore,
  nodeDB: NodeDB,
) => {
  let myNodeNum = 0;

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

  connection.events.onTelemetryPacket.subscribe(() => {
    // device.setMetrics(telemetryPacket);
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

  connection.events.onUserPacket.subscribe((user) => {
    nodeDB.addUser(user);
  });

  connection.events.onPositionPacket.subscribe((position) => {
    nodeDB.addPosition(position);
  });

  // NOTE: Node handling is managed by the nodeDB
  // Nodes are added via subscriptions.ts and stored in nodeDB
  // Configuration is handled directly by meshDevice.configure() in useConnections
  connection.events.onNodeInfoPacket.subscribe((nodeInfo) => {
    nodeDB.addNode(nodeInfo);
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
    // incoming and outgoing messages are handled by this event listener
    const dto = new PacketToMessageDTO(messagePacket, myNodeNum);
    const message = dto.toMessage();

    // Set initial state based on message direction
    // For outgoing messages (from === myNodeNum), start in 'Sent' state since they're being received from radio
    // For incoming messages, use 'Ack' state as they're successfully delivered
    if (message.from === myNodeNum) {
      message.state = MessageState.Sent; // Outgoing message successfully sent to radio
    } else {
      message.state = MessageState.Ack; // Incoming message successfully received
    }

    // Initialize delivery status fields
    message.retryCount = 0;
    message.maxRetries = 3;
    message.receivedACK = false;
    message.ackError = 0;
    message.ackTimestamp = 0;
    message.ackSNR = 0;
    message.realACK = false;

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
    nodeDB.processPacket({
      from: meshPacket.from,
      snr: meshPacket.rxSnr,
      time: meshPacket.rxTime,
    });
  });

  connection.events.onClientNotificationPacket.subscribe(
    (clientNotificationPacket) => {
      device.addClientNotification(clientNotificationPacket);
      device.setDialogOpen("clientNotification", true);
    },
  );

  connection.events.onNeighborInfoPacket.subscribe((neighborInfo) => {
    device.addNeighborInfo(neighborInfo.from, neighborInfo.data);
  });

  connection.events.onAtakPacket.subscribe((atakPacket) => {
    // Handle ACK packets to update message state to Ack
    console.log(
      `[subscriptions] Received ACK packet from ${atakPacket.from}`,
      atakPacket,
    );

    // Find the message and update its state
    // Note: This is a simplified approach - in practice we'd need better message correlation
    const messages = messageStore.getMessages({
      type: MessageType.Direct,
      nodeA: myNodeNum,
      nodeB: atakPacket.from,
    });

    // Find the most recent message to this recipient that hasn't been acknowledged yet
    const unackedMessage = messages
      .filter((msg) => msg.from === myNodeNum && msg.state !== MessageState.Ack)
      .sort((a, b) => b.date - a.date)[0];

    if (unackedMessage) {
      // Extract delivery information from ACK packet
      const ackSNR = atakPacket.rxSnr || 0;
      const realACK = true; // ACK packet means real acknowledgment

      messageStore.setMessageState({
        type: MessageType.Direct,
        nodeA: myNodeNum,
        nodeB: atakPacket.from,
        messageId: unackedMessage.messageId,
        newState: MessageState.Ack,
      });

      // Also update the message object with delivery details
      const updatedMessage = messageStore.getMessage(unackedMessage.messageId);
      if (updatedMessage) {
        updatedMessage.ackSNR = ackSNR;
        updatedMessage.realACK = realACK;
        updatedMessage.ackTimestamp = Date.now();
      }

      console.log(
        `[subscriptions] Updated message ${unackedMessage.messageId} state to Ack with SNR: ${ackSNR}`,
      );
    }
  });

  connection.events.onRoutingPacket.subscribe((routingPacket) => {
    if (routingPacket.data.variant.case === "errorReason") {
      switch (routingPacket.data.variant.value) {
        case Protobuf.Mesh.Routing_Error.MAX_RETRANSMIT:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          // Mark outgoing messages as failed due to max retransmit
          updateFailedMessagesForRecipient(
            routingPacket.from,
            routingPacket.data.variant.value,
          );
          break;
        case Protobuf.Mesh.Routing_Error.NO_CHANNEL:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          nodeDB.setNodeError(
            routingPacket.from,
            routingPacket?.data?.variant?.value,
          );
          device.setDialogOpen("refreshKeys", true);
          // Mark outgoing messages as failed due to no channel
          updateFailedMessagesForRecipient(
            routingPacket.from,
            routingPacket.data.variant.value,
          );
          break;
        case Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY:
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          nodeDB.setNodeError(
            routingPacket.from,
            routingPacket?.data?.variant?.value,
          );
          device.setDialogOpen("refreshKeys", true);
          // Mark outgoing messages as failed due to PKI error
          updateFailedMessagesForRecipient(
            routingPacket.from,
            routingPacket.data.variant.value,
          );
          break;
        default: {
          console.error(`Routing Error: ${routingPacket.data.variant.value}`);
          updateFailedMessagesForRecipient(
            routingPacket.from,
            routingPacket.data.variant.value,
          );
          break;
        }
      }
    }
  });

  /**
   * Helper function to update failed messages for a specific recipient
   */
  function updateFailedMessagesForRecipient(
    recipientNodeNum: number,
    errorCode: number,
  ) {
    // Find outgoing messages to this recipient that aren't already failed
    const messages = messageStore.getMessages({
      type: MessageType.Direct,
      nodeA: myNodeNum,
      nodeB: recipientNodeNum,
    });

    const pendingMessages = messages.filter(
      (msg) =>
        msg.from === myNodeNum &&
        msg.state !== MessageState.Failed &&
        msg.state !== MessageState.Ack,
    );

    // Update the most recent pending message to failed state
    if (pendingMessages.length > 0) {
      const mostRecent = pendingMessages.sort((a, b) => b.date - a.date)[0];
      if (mostRecent) {
        messageStore.setMessageState({
          type: MessageType.Direct,
          nodeA: myNodeNum,
          nodeB: recipientNodeNum,
          messageId: mostRecent.messageId,
          newState: MessageState.Failed,
        });

        console.log(
          `[subscriptions] Updated message ${mostRecent.messageId} state to Failed due to routing error ${errorCode}`,
        );
      }
    }
  }
};
