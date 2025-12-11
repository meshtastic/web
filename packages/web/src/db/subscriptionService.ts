/** biome-ignore-all lint/complexity/noStaticOnlyClass: <explanation> */
import { toJson } from "@bufbuild/protobuf";
import { fromByteArray } from "base64-js";
import { type MeshDevice, Protobuf } from "@meshtastic/core";
import { channelRepo, messageRepo, nodeRepo, packetLogRepo } from "./repositories";
import type {
  NewMessage,
  NewNode,
  NewPacketLog,
  NewPositionLog,
  NewTelemetryLog,
} from "./schema";
import { dbEvents, DB_EVENTS } from "./events";
import { packetWriteQueue } from "./writeQueue";

/**
 * Service to subscribe to mesh device events and write to database
 */
export class SubscriptionService {
  /**
   * Subscribe to all relevant events for a device
   */
  static subscribeToDevice(
    deviceId: number,
    myNodeNum: number,
    connection: MeshDevice,
  ): () => void {
    console.log(`[DB Subscriptions] Subscribing to device ${deviceId}...`);

    // Store unsubscribe functions
    const unsubscribers: Array<() => void> = [];

    // Subscribe to position packets
    unsubscribers.push(
      connection.events.onPositionPacket.subscribe(async (position) => {
        try {
          // Update current position in nodes table
          await nodeRepo.updatePosition(deviceId, position.from, {
            latitudeI: position.data.latitudeI,
            longitudeI: position.data.longitudeI,
            altitude: position.data.altitude,
            // Convert Unix timestamp (seconds) to Date if present
            positionTime: position.data.time
              ? new Date(position.data.time * 1000)
              : undefined,
            positionPrecisionBits: position.data.precisionBits,
            groundSpeed: position.data.groundSpeed,
            groundTrack: position.data.groundTrack,
            satsInView: position.data.satsInView,
          });

          // Log position history
          const positionLog: NewPositionLog = {
            deviceId,
            nodeNum: position.from,
            latitudeI: position.data.latitudeI,
            longitudeI: position.data.longitudeI,
            altitude: position.data.altitude,
            // Convert Unix timestamp (seconds) to Date if present
            time: position.data.time
              ? new Date(position.data.time * 1000)
              : undefined,
            precisionBits: position.data.precisionBits,
            groundSpeed: position.data.groundSpeed,
            groundTrack: position.data.groundTrack,
            satsInView: position.data.satsInView,
          };

          await nodeRepo.logPosition(positionLog);

          dbEvents.emit(DB_EVENTS.POSITION_UPDATED);
        } catch (error) {
          console.error("[DB Subscriptions] Error saving position:", error);
        }
      }),
    );

    // Subscribe to user packets
    unsubscribers.push(
      connection.events.onUserPacket.subscribe(async (user) => {
        try {
          await nodeRepo.updateUser(deviceId, user.from, {
            userId: user.data.id,
            longName: user.data.longName,
            shortName: user.data.shortName,
            macaddr: user.data.macaddr
              ? fromByteArray(user.data.macaddr)
              : undefined,
            hwModel: user.data.hwModel,
            role: user.data.role,
            publicKey: user.data.publicKey
              ? fromByteArray(user.data.publicKey)
              : undefined,
            isLicensed: user.data.isLicensed,
          });

          dbEvents.emit(DB_EVENTS.NODE_UPDATED);
        } catch (error) {
          console.error("[DB Subscriptions] Error saving user:", error);
        }
      }),
    );

    // Subscribe to node info packets
    unsubscribers.push(
      connection.events.onNodeInfoPacket.subscribe(async (nodeInfo) => {
        try {
          const newNode: NewNode = {
            deviceId,
            nodeNum: nodeInfo.num,
            // Convert Unix timestamp (seconds) to Date if present
            lastHeard: nodeInfo.lastHeard
              ? new Date(nodeInfo.lastHeard * 1000)
              : undefined,
            snr: nodeInfo.snr,
            isFavorite: nodeInfo.isFavorite || false,
            isIgnored: nodeInfo.isIgnored || false,

            // User info
            userId: nodeInfo.user?.id,
            longName: nodeInfo.user?.longName,
            shortName: nodeInfo.user?.shortName,
            macaddr: nodeInfo.user?.macaddr
              ? fromByteArray(nodeInfo.user.macaddr)
              : undefined,
            hwModel: nodeInfo.user?.hwModel,
            role: nodeInfo.user?.role,
            publicKey: nodeInfo.user?.publicKey
              ? fromByteArray(nodeInfo.user.publicKey)
              : undefined,
            isLicensed: nodeInfo.user?.isLicensed,

            // Position
            latitudeI: nodeInfo.position?.latitudeI,
            longitudeI: nodeInfo.position?.longitudeI,
            altitude: nodeInfo.position?.altitude,
            // Convert Unix timestamp (seconds) to Date if present
            positionTime: nodeInfo.position?.time
              ? new Date(nodeInfo.position.time * 1000)
              : undefined,
            positionPrecisionBits: nodeInfo.position?.precisionBits,
            groundSpeed: nodeInfo.position?.groundSpeed,
            groundTrack: nodeInfo.position?.groundTrack,
            satsInView: nodeInfo.position?.satsInView,

            // Device metrics
            batteryLevel: nodeInfo.deviceMetrics?.batteryLevel,
            voltage: nodeInfo.deviceMetrics?.voltage,
            channelUtilization: nodeInfo.deviceMetrics?.channelUtilization,
            airUtilTx: nodeInfo.deviceMetrics?.airUtilTx,
            uptimeSeconds: nodeInfo.deviceMetrics?.uptimeSeconds,
          };

          await nodeRepo.upsertNode(newNode);

          // Emit event to notify listeners
          dbEvents.emit(DB_EVENTS.NODE_UPDATED);
        } catch (error) {
          console.error("[DB Subscriptions] Error saving node:", error);
        }
      }),
    );

    // Subscribe to telemetry packets
    unsubscribers.push(
      connection.events.onTelemetryPacket.subscribe(async (telemetry) => {
        try {
          // Update current metrics in nodes table
          await nodeRepo.updateMetrics(deviceId, telemetry.from, {
            batteryLevel: telemetry.data.deviceMetrics?.batteryLevel,
            voltage: telemetry.data.deviceMetrics?.voltage,
            channelUtilization:
              telemetry.data.deviceMetrics?.channelUtilization,
            airUtilTx: telemetry.data.deviceMetrics?.airUtilTx,
            uptimeSeconds: telemetry.data.deviceMetrics?.uptimeSeconds,
          });

          // Log telemetry history
          const telemetryLog: NewTelemetryLog = {
            deviceId,
            nodeNum: telemetry.from,
            // Convert Unix timestamp (seconds) to Date if present
            time: telemetry.data.time
              ? new Date(telemetry.data.time * 1000)
              : undefined,

            // Device metrics
            batteryLevel: telemetry.data.deviceMetrics?.batteryLevel,
            voltage: telemetry.data.deviceMetrics?.voltage,
            channelUtilization:
              telemetry.data.deviceMetrics?.channelUtilization,
            airUtilTx: telemetry.data.deviceMetrics?.airUtilTx,
            uptimeSeconds: telemetry.data.deviceMetrics?.uptimeSeconds,

            // Environmental metrics
            temperature: telemetry.data.environmentMetrics?.temperature,
            relativeHumidity:
              telemetry.data.environmentMetrics?.relativeHumidity,
            barometricPressure:
              telemetry.data.environmentMetrics?.barometricPressure,

            // Power metrics
            current: telemetry.data.powerMetrics?.ch1Current,
          };

          await nodeRepo.logTelemetry(telemetryLog);

          dbEvents.emit(DB_EVENTS.TELEMETRY_UPDATED);
        } catch (error) {
          console.error("[DB Subscriptions] Error saving telemetry:", error);
        }
      }),
    );

    // Subscribe to mesh packets (for lastHeard updates and packet logging)
    unsubscribers.push(
      connection.events.onMeshPacket.subscribe((meshPacket) => {
        // Update last heard for the node (higher priority, don't queue)
        nodeRepo
          .updateLastHeard(
            deviceId,
            meshPacket.from,
            meshPacket.rxTime,
            meshPacket.rxSnr,
          )
          .then(() => {
            dbEvents.emit(DB_EVENTS.NODE_UPDATED);
          })
          .catch((error) => {
            console.error("[DB Subscriptions] Error updating lastHeard:", error);
          });

        // Log the packet to packet_logs table via queue (batched for performance)
        const packetLog: NewPacketLog = {
          deviceId,
          fromNode: meshPacket.from,
          toNode: meshPacket.to,
          channel: meshPacket.channel,
          packetId: meshPacket.id,
          hopLimit: meshPacket.hopLimit,
          hopStart: meshPacket.hopStart,
          wantAck: meshPacket.wantAck,
          rxSnr: meshPacket.rxSnr,
          rxRssi: meshPacket.rxRssi,
          rxTime: meshPacket.rxTime
            ? new Date(
                meshPacket.rxTime > 100000000000
                  ? meshPacket.rxTime
                  : meshPacket.rxTime * 1000,
              )
            : new Date(),
          rawPacket: toJson(Protobuf.Mesh.MeshPacketSchema, meshPacket),
        };

        packetWriteQueue
          .enqueue(() => packetLogRepo.logPacket(packetLog))
          .catch((error) => {
            console.error("[DB Subscriptions] Error logging packet:", error);
          });
      }),
    );

    // Subscribe to message packets
    unsubscribers.push(
      connection.events.onMessagePacket.subscribe(async (messagePacket) => {
        try {
          // messagePacket.data is already a decoded string from the core library
          const messageText = messagePacket.data;

          // Skip empty messages (can happen with certain packet types)
          if (!messageText) {
            console.log("[DB Subscriptions] Skipping empty message packet");
            return;
          }

          const type = messagePacket.to === 0xffffffff ? "broadcast" : "direct";

          // Calculate hops safely (both values must be defined)
          const hops =
            messagePacket.hopStart !== undefined &&
            messagePacket.hopLimit !== undefined
              ? messagePacket.hopStart - messagePacket.hopLimit
              : 0;

          // Handle rxTime - could be in seconds or milliseconds
          // If rxTime is very large (> year 3000 in ms), it's likely already in ms
          let dateMs: number;
          if (messagePacket.rxTime > 100000000000) {
            // Already in milliseconds
            dateMs = messagePacket.rxTime;
          } else if (messagePacket.rxTime > 0) {
            // In seconds, convert to ms
            dateMs = messagePacket.rxTime * 1000;
          } else {
            // Fallback to now
            dateMs = Date.now();
          }

          const newMessage: NewMessage = {
            deviceId,
            messageId: messagePacket.id,
            type,
            channelId: messagePacket.channel ?? 0,
            fromNode: messagePacket.from,
            toNode: messagePacket.to,
            message: messageText,
            date: new Date(dateMs),
            state: messagePacket.from === myNodeNum ? "sent" : "ack",
            rxSnr: messagePacket.rxSnr ?? 0,
            rxRssi: messagePacket.rxRssi ?? 0,
            viaMqtt: messagePacket.viaMqtt ?? false,
            hops,
            retryCount: 0,
            maxRetries: 3,
            receivedACK: false,
            ackError: 0,
            realACK: false,
          };

          await messageRepo.saveMessage(newMessage);

          // Emit event to notify listeners
          dbEvents.emit(DB_EVENTS.MESSAGE_SAVED);
        } catch (error) {
          console.error("[DB Subscriptions] Error saving message:", error);
        }
      }),
    );

    // Subscribe to channel packets
    unsubscribers.push(
      connection.events.onChannelPacket.subscribe(async (channel) => {
        try {
          await channelRepo.upsertChannel({
            deviceId,
            channelIndex: channel.index,
            role: channel.role,
            name: channel.settings?.name,
            psk: channel.settings?.psk
              ? fromByteArray(channel.settings.psk)
              : undefined,
            uplinkEnabled: channel.settings?.uplinkEnabled,
            downlinkEnabled: channel.settings?.downlinkEnabled,
            positionPrecision:
              channel.settings?.moduleSettings?.positionPrecision,
          });

          dbEvents.emit(DB_EVENTS.CHANNEL_UPDATED);
        } catch (error) {
          console.error("[DB Subscriptions] Error saving channel:", error);
        }
      }),
    );

    // Return unsubscribe function
    return () => {
      console.log(
        `[DB Subscriptions] Unsubscribing from device ${deviceId}...`,
      );
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }
}
