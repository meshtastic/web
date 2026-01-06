// subscriptionService.ts
import { toJson } from "@bufbuild/protobuf";
import { type MeshDevice, Protobuf, type Types } from "@meshtastic/core";
import { fromByteArray } from "base64-js";
import logger from "../core/services/logger.ts";
import { runReceiveHooks } from "../core/services/messageHooks.ts";
import { packetBatcher } from "./packetBatcher.ts";
import {
  channelRepo,
  messageRepo,
  nodeRepo,
  reactionRepo,
} from "./repositories/index.ts";
import type {
  NewMessage,
  NewNode,
  NewPacketLog,
  NewPositionLog,
  NewTelemetryLog,
} from "./schema.ts";

const BROADCAST_ADDRESS = 0xffffffff;
const MS_THRESHOLD = 100_000_000_000; // ms

const unixToDate = (timestamp: number | undefined): Date | undefined => {
  if (!timestamp) {
    return undefined;
  }
  return new Date(timestamp * 1000);
};

const flexibleTimestampToDate = (timestamp: number): Date => {
  if (timestamp > MS_THRESHOLD) {
    return new Date(timestamp);
  }
  if (timestamp > 0) {
    return new Date(timestamp * 1000);
  }
  return new Date();
};

const bytesToBase64 = (bytes: Uint8Array | undefined): string | undefined => {
  return bytes ? fromByteArray(bytes) : undefined;
};

const withErrorHandling =
  <T>(context: string, handler: (data: T) => Promise<void>) =>
  async (data: T): Promise<void> => {
    try {
      await handler(data);
    } catch (error) {
      logger.error(`[DB Subscriptions] Error ${context}:`, error);
    }
  };

// Individual subscription handlers
const createPositionHandler =
  (ownerNodeNum: number) =>
  async (position: Types.PacketMetadata<Protobuf.Mesh.Position>) => {
    const positionData = {
      latitudeI: position.data.latitudeI,
      longitudeI: position.data.longitudeI,
      altitude: position.data.altitude,
      positionTime: unixToDate(position.data.time),
      positionPrecisionBits: position.data.precisionBits,
      groundSpeed: position.data.groundSpeed,
      groundTrack: position.data.groundTrack,
      satsInView: position.data.satsInView,
    };

    await nodeRepo.updatePosition(ownerNodeNum, position.from, positionData);

    const positionLog: NewPositionLog = {
      ownerNodeNum,
      nodeNum: position.from,
      latitudeI: position.data.latitudeI,
      longitudeI: position.data.longitudeI,
      altitude: position.data.altitude,
      time: unixToDate(position.data.time),
      precisionBits: position.data.precisionBits,
      groundSpeed: position.data.groundSpeed,
      groundTrack: position.data.groundTrack,
      satsInView: position.data.satsInView,
    };

    await nodeRepo.logPosition(positionLog);
  };

const createUserHandler =
  (ownerNodeNum: number) =>
  async (user: Types.PacketMetadata<Protobuf.Mesh.User>) => {
    await nodeRepo.updateUser(ownerNodeNum, user.from, {
      userId: user.data.id,
      longName: user.data.longName,
      shortName: user.data.shortName,
      macaddr: bytesToBase64(user.data.macaddr),
      hwModel: user.data.hwModel,
      role: user.data.role,
      publicKey: bytesToBase64(user.data.publicKey),
      isLicensed: user.data.isLicensed,
    });
  };

const createNodeInfoHandler =
  (ownerNodeNum: number) => async (nodeInfo: Protobuf.Mesh.NodeInfo) => {
    const newNode: NewNode = {
      ownerNodeNum,
      nodeNum: nodeInfo.num,
      lastHeard: unixToDate(nodeInfo.lastHeard),
      snr: nodeInfo.snr,
      isFavorite: nodeInfo.isFavorite ?? false,
      isIgnored: nodeInfo.isIgnored ?? false,

      userId: nodeInfo.user?.id,
      longName: nodeInfo.user?.longName,
      shortName: nodeInfo.user?.shortName,
      macaddr: bytesToBase64(nodeInfo.user?.macaddr),
      hwModel: nodeInfo.user?.hwModel,
      role: nodeInfo.user?.role,
      publicKey: bytesToBase64(nodeInfo.user?.publicKey),
      isLicensed: nodeInfo.user?.isLicensed,
      latitudeI: nodeInfo.position?.latitudeI,
      longitudeI: nodeInfo.position?.longitudeI,
      altitude: nodeInfo.position?.altitude,
      positionTime: unixToDate(nodeInfo.position?.time),
      positionPrecisionBits: nodeInfo.position?.precisionBits,
      groundSpeed: nodeInfo.position?.groundSpeed,
      groundTrack: nodeInfo.position?.groundTrack,
      satsInView: nodeInfo.position?.satsInView,

      batteryLevel: nodeInfo.deviceMetrics?.batteryLevel,
      voltage: nodeInfo.deviceMetrics?.voltage,
      channelUtilization: nodeInfo.deviceMetrics?.channelUtilization,
      airUtilTx: nodeInfo.deviceMetrics?.airUtilTx,
      uptimeSeconds: nodeInfo.deviceMetrics?.uptimeSeconds,
    };

    await nodeRepo.upsertNode(newNode);
  };

const createTelemetryHandler =
  (ownerNodeNum: number) =>
  async (telemetry: Types.PacketMetadata<Protobuf.Telemetry.Telemetry>) => {
    await nodeRepo.updateMetrics(ownerNodeNum, telemetry.from, {
      batteryLevel: telemetry.data.deviceMetrics?.batteryLevel,
      voltage: telemetry.data.deviceMetrics?.voltage,
      channelUtilization: telemetry.data.deviceMetrics?.channelUtilization,
      airUtilTx: telemetry.data.deviceMetrics?.airUtilTx,
      uptimeSeconds: telemetry.data.deviceMetrics?.uptimeSeconds,
    });

    const telemetryLog: NewTelemetryLog = {
      ownerNodeNum,
      nodeNum: telemetry.from,
      time: unixToDate(telemetry.data.time),
      batteryLevel: telemetry.data.deviceMetrics?.batteryLevel,
      voltage: telemetry.data.deviceMetrics?.voltage,
      channelUtilization: telemetry.data.deviceMetrics?.channelUtilization,
      airUtilTx: telemetry.data.deviceMetrics?.airUtilTx,
      uptimeSeconds: telemetry.data.deviceMetrics?.uptimeSeconds,
      temperature: telemetry.data.environmentMetrics?.temperature,
      relativeHumidity: telemetry.data.environmentMetrics?.relativeHumidity,
      barometricPressure: telemetry.data.environmentMetrics?.barometricPressure,
      current: telemetry.data.powerMetrics?.ch1Current,
    };

    await nodeRepo.logTelemetry(telemetryLog);
  };

const createMeshPacketHandler =
  (ownerNodeNum: number) => (meshPacket: Protobuf.Mesh.MeshPacket) => {
    // Update last heard (fire-and-forget, high priority)
    nodeRepo
      .updateLastHeard(
        ownerNodeNum,
        meshPacket.from,
        meshPacket.rxTime,
        meshPacket.rxSnr,
      )
      .catch((error) =>
        logger.error("[DB Subscriptions] Error updating lastHeard:", error),
      );

    // Batch packet logging for performance
    const packetLog: NewPacketLog = {
      ownerNodeNum,
      fromNode: meshPacket.from,
      toNode: meshPacket.to,
      channel: meshPacket.channel,
      packetId: meshPacket.id,
      hopLimit: meshPacket.hopLimit,
      hopStart: meshPacket.hopStart,
      wantAck: meshPacket.wantAck,
      rxSnr: meshPacket.rxSnr,
      rxRssi: meshPacket.rxRssi,
      rxTime: flexibleTimestampToDate(meshPacket.rxTime ?? 0),
      rawPacket: toJson(Protobuf.Mesh.MeshPacketSchema, meshPacket),
    };

    packetBatcher.add(packetLog);
  };

const createMessageHandler =
  (ownerNodeNum: number, myNodeNum: number) =>
  async (messagePacket: Types.PacketMetadata<string>) => {
    if (messagePacket.from === myNodeNum) {
      return;
    }

    if (
      messagePacket.emoji &&
      messagePacket.emoji > 0 &&
      messagePacket.replyId
    ) {
      const emoji = String.fromCodePoint(messagePacket.emoji);
      logger.debug(
        `[DB Subscriptions] Received reaction ${emoji} to message ${messagePacket.replyId} from ${messagePacket.from}`,
      );

      await reactionRepo.addReaction({
        ownerNodeNum,
        targetMessageId: messagePacket.replyId,
        fromNode: messagePacket.from,
        emoji,
        createdAt: new Date(),
      });
      return;
    }

    const messageText = messagePacket.data;
    if (!messageText) {
      logger.debug("[DB Subscriptions] Skipping empty message packet");
      return;
    }

    const hops =
      messagePacket.hopStart !== undefined &&
      messagePacket.hopLimit !== undefined
        ? messagePacket.hopStart - messagePacket.hopLimit
        : 0;

    const newMessage: NewMessage = {
      ownerNodeNum,
      messageId: messagePacket.id,
      type: messagePacket.to === BROADCAST_ADDRESS ? "channel" : "direct",
      channelId: messagePacket.channel ?? 0,
      fromNode: messagePacket.from,
      toNode: messagePacket.to,
      message: messageText,
      date: flexibleTimestampToDate(messagePacket.rxTime ?? 0),
      state: "ack",
      rxSnr: messagePacket.rxSnr ?? 0,
      rxRssi: messagePacket.rxRssi ?? 0,
      viaMqtt: messagePacket.viaMqtt ?? false,
      hops,
      retryCount: 0,
      maxRetries: 3,
      receivedACK: false,
      ackError: 0,
      realACK: false,
      replyId: messagePacket.replyId ?? null,
    };

    await messageRepo.saveMessage(newMessage);

    await runReceiveHooks(
      {
        id: messagePacket.id,
        from: messagePacket.from,
        to: messagePacket.to,
        text: messageText,
        channel: messagePacket.channel ?? 0,
        replyId: messagePacket.replyId,
        emoji: messagePacket.emoji,
      },
      ownerNodeNum,
    );
  };

const createChannelHandler =
  (ownerNodeNum: number) => async (channel: Protobuf.Channel.Channel) => {
    console.log(channel);

    await channelRepo.upsertChannel({
      ownerNodeNum,
      channelIndex: channel.index,
      role: channel.role,
      name: channel.index === 0 ? "Primary" : channel.settings?.name,
      psk: bytesToBase64(channel.settings?.psk),
      uplinkEnabled: channel.settings?.uplinkEnabled,
      downlinkEnabled: channel.settings?.downlinkEnabled,
      positionPrecision: channel.settings?.moduleSettings?.positionPrecision,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

export function subscribeToDevice(
  ownerNodeNum: number,
  myNodeNum: number,
  connection: MeshDevice,
): () => void {
  logger.debug(`[DB Subscriptions] Subscribing to device ${ownerNodeNum}...`);

  const { events } = connection;

  const unsubscribers = [
    events.onPositionPacket.subscribe(
      withErrorHandling("saving position", createPositionHandler(ownerNodeNum)),
    ),
    events.onUserPacket.subscribe(
      withErrorHandling("saving user", createUserHandler(ownerNodeNum)),
    ),
    events.onNodeInfoPacket.subscribe(
      withErrorHandling("saving node", createNodeInfoHandler(ownerNodeNum)),
    ),
    events.onTelemetryPacket.subscribe(
      withErrorHandling(
        "saving telemetry",
        createTelemetryHandler(ownerNodeNum),
      ),
    ),
    events.onMeshPacket.subscribe(createMeshPacketHandler(ownerNodeNum)),
    events.onMessagePacket.subscribe(
      withErrorHandling(
        "saving message",
        createMessageHandler(ownerNodeNum, myNodeNum),
      ),
    ),
    events.onChannelPacket.subscribe(
      withErrorHandling("saving channel", createChannelHandler(ownerNodeNum)),
    ),
  ];

  return () => {
    logger.debug(
      `[DB Subscriptions] Unsubscribing from device ${ownerNodeNum}...`,
    );
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
