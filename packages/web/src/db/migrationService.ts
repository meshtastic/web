import { fromByteArray } from "base64-js";
import { eq } from "drizzle-orm";
import type {
  Device,
  MessageStore,
  NodeDB,
} from "@core/stores";
import { MessageType } from "@core/stores";
import { dbClient } from "./client";
import {
  channels,
  lastRead,
  messageDrafts,
  messages,
  nodes,
  type NewChannel,
  type NewLastRead,
  type NewMessage,
  type NewMessageDraft,
  type NewNode,
} from "./schema";

/**
 * Migration service for converting Zustand data to SQL
 */
export class MigrationService {
  /**
   * Migrate all data from Zustand stores to SQL database
   */
  static async migrateAll(
    deviceId: number,
    device: Device,
    messageStore: MessageStore,
    nodeDB: NodeDB,
  ): Promise<{
    messages: number;
    nodes: number;
    channels: number;
    drafts: number;
    lastRead: number;
  }> {
    console.log(`[Migration] Starting migration for device ${deviceId}...`);

    const stats = {
      messages: 0,
      nodes: 0,
      channels: 0,
      drafts: 0,
      lastRead: 0,
    };

    // Ensure database is initialized
    await dbClient.init();
    const db = dbClient.db;

    try {
      // Migrate messages
      stats.messages = await this.migrateMessages(
        deviceId,
        messageStore,
        db,
      );

      // Migrate nodes
      stats.nodes = await this.migrateNodes(deviceId, nodeDB, db);

      // Migrate channels
      stats.channels = await this.migrateChannels(deviceId, device, db);

      // Migrate drafts
      stats.drafts = await this.migrateDrafts(deviceId, messageStore, db);

      // Migrate last read
      stats.lastRead = await this.migrateLastRead(deviceId, messageStore, db);

      console.log(`[Migration] Completed for device ${deviceId}:`, stats);
    } catch (error) {
      console.error(`[Migration] Failed for device ${deviceId}:`, error);
      throw error;
    }

    return stats;
  }

  /**
   * Migrate messages from Zustand to SQL
   */
  private static async migrateMessages(
    deviceId: number,
    messageStore: MessageStore,
    db: ReturnType<typeof dbClient.db>,
  ): Promise<number> {
    console.log(`[Migration] Migrating messages for device ${deviceId}...`);

    let count = 0;

    // Migrate direct messages
    for (const [conversationId, msgMap] of messageStore.messages.direct) {
      const msgs = Array.from(msgMap.values());

      for (const msg of msgs) {
        const newMessage: NewMessage = {
          deviceId,
          messageId: msg.messageId,
          type: "direct",
          channelId: msg.channel,
          fromNode: msg.from,
          toNode: msg.to,
          message: msg.message,
          date: new Date(msg.date),
          state: msg.state,
          rxSnr: msg.rxSnr,
          rxRssi: msg.rxRssi,
          viaMqtt: msg.viaMqtt,
          hops: msg.hops,
          retryCount: msg.retryCount,
          maxRetries: msg.maxRetries,
          receivedACK: msg.receivedACK,
          ackError: msg.ackError,
          ackTimestamp: msg.ackTimestamp
            ? new Date(msg.ackTimestamp)
            : undefined,
          ackSNR: msg.ackSNR,
          realACK: msg.realACK,
        };

        await db.insert(messages).values(newMessage);
        count++;
      }
    }

    // Migrate broadcast messages
    for (const [channelId, msgMap] of messageStore.messages.broadcast) {
      const msgs = Array.from(msgMap.values());

      for (const msg of msgs) {
        const newMessage: NewMessage = {
          deviceId,
          messageId: msg.messageId,
          type: "broadcast",
          channelId: msg.channel,
          fromNode: msg.from,
          toNode: msg.to,
          message: msg.message,
          date: new Date(msg.date),
          state: msg.state,
          rxSnr: msg.rxSnr,
          rxRssi: msg.rxRssi,
          viaMqtt: msg.viaMqtt,
          hops: msg.hops,
          retryCount: msg.retryCount,
          maxRetries: msg.maxRetries,
          receivedACK: msg.receivedACK,
          ackError: msg.ackError,
          ackTimestamp: msg.ackTimestamp
            ? new Date(msg.ackTimestamp)
            : undefined,
          ackSNR: msg.ackSNR,
          realACK: msg.realACK,
        };

        await db.insert(messages).values(newMessage);
        count++;
      }
    }

    console.log(
      `[Migration] Migrated ${count} messages for device ${deviceId}`,
    );
    return count;
  }

  /**
   * Migrate nodes from Zustand to SQL
   */
  private static async migrateNodes(
    deviceId: number,
    nodeDB: NodeDB,
    db: ReturnType<typeof dbClient.db>,
  ): Promise<number> {
    console.log(`[Migration] Migrating nodes for device ${deviceId}...`);

    let count = 0;
    const nodeList = nodeDB.getNodes(undefined, true); // Include self

    for (const node of nodeList) {
      const newNode: NewNode = {
        deviceId,
        nodeNum: node.num,
        lastHeard: node.lastHeard,
        snr: node.snr,
        isFavorite: node.isFavorite || false,
        isIgnored: node.isIgnored || false,

        // User info
        userId: node.user?.id,
        longName: node.user?.longName,
        shortName: node.user?.shortName,
        macaddr: node.user?.macaddr
          ? fromByteArray(node.user.macaddr)
          : undefined,
        hwModel: node.user?.hwModel,
        role: node.user?.role,
        publicKey: node.user?.publicKey
          ? fromByteArray(node.user.publicKey)
          : undefined,
        isLicensed: node.user?.isLicensed,

        // Position
        latitudeI: node.position?.latitudeI,
        longitudeI: node.position?.longitudeI,
        altitude: node.position?.altitude,
        positionTime: node.position?.time,
        positionPrecisionBits: node.position?.precisionBits,
        groundSpeed: node.position?.groundSpeed,
        groundTrack: node.position?.groundTrack,
        satsInView: node.position?.satsInView,

        // Device metrics
        batteryLevel: node.deviceMetrics?.batteryLevel,
        voltage: node.deviceMetrics?.voltage,
        channelUtilization: node.deviceMetrics?.channelUtilization,
        airUtilTx: node.deviceMetrics?.airUtilTx,
        uptimeSeconds: node.deviceMetrics?.uptimeSeconds,
      };

      await db.insert(nodes).values(newNode);
      count++;
    }

    console.log(`[Migration] Migrated ${count} nodes for device ${deviceId}`);
    return count;
  }

  /**
   * Migrate channels from Zustand to SQL
   * NOTE: Channels are now stored in the database directly via subscriptionService.
   * This migration is no longer needed as device.channels has been removed from the Device store.
   */
  private static async migrateChannels(
    deviceId: number,
    device: Device,
    db: ReturnType<typeof dbClient.db>,
  ): Promise<number> {
    console.log(`[Migration] Skipping channel migration for device ${deviceId} - channels are now managed in database`);
    return 0;
  }

  /**
   * Migrate message drafts from Zustand to SQL
   */
  private static async migrateDrafts(
    deviceId: number,
    messageStore: MessageStore,
    db: ReturnType<typeof dbClient.db>,
  ): Promise<number> {
    console.log(
      `[Migration] Migrating message drafts for device ${deviceId}...`,
    );

    let count = 0;

    for (const [conversationId, draft] of messageStore.drafts) {
      if (!draft || draft.trim() === "") continue;

      // Parse conversation ID to determine type and target
      // Format for direct: "nodeA:nodeB"
      // Format for broadcast: channelId
      const parts = conversationId.split(":");

      let type: "direct" | "broadcast";
      let targetId: number;

      if (parts.length === 2) {
        // Direct message
        type = "direct";
        // Use the other participant's node number as target
        // Assuming messageStore.myNodeNum is available
        const nodeA = Number.parseInt(parts[0]);
        const nodeB = Number.parseInt(parts[1]);
        targetId =
          nodeA === messageStore.myNodeNum ? nodeB : nodeA;
      } else {
        // Broadcast message (channelId)
        type = "broadcast";
        targetId = Number.parseInt(conversationId);
      }

      const newDraft: NewMessageDraft = {
        deviceId,
        type,
        targetId,
        content: draft,
      };

      await db.insert(messageDrafts).values(newDraft);
      count++;
    }

    console.log(
      `[Migration] Migrated ${count} drafts for device ${deviceId}`,
    );
    return count;
  }

  /**
   * Migrate last read markers from Zustand to SQL
   */
  private static async migrateLastRead(
    deviceId: number,
    messageStore: MessageStore,
    db: ReturnType<typeof dbClient.db>,
  ): Promise<number> {
    console.log(
      `[Migration] Migrating last read markers for device ${deviceId}...`,
    );

    let count = 0;

    for (const [conversationId, messageId] of messageStore.lastRead) {
      // Determine type based on conversation ID format
      const parts = conversationId.split(":");
      const type: "direct" | "broadcast" = parts.length === 2 ? "direct" : "broadcast";

      const newLastRead: NewLastRead = {
        deviceId,
        type,
        conversationId,
        messageId,
      };

      await db.insert(lastRead).values(newLastRead);
      count++;
    }

    console.log(
      `[Migration] Migrated ${count} last read markers for device ${deviceId}`,
    );
    return count;
  }

  /**
   * Delete all data for a specific device from SQL
   */
  static async deleteDeviceData(deviceId: number): Promise<void> {
    console.log(`[Migration] Deleting data for device ${deviceId}...`);

    await dbClient.init();
    const db = dbClient.db;

    await db.delete(messages).where(eq(messages.deviceId, deviceId));
    await db.delete(nodes).where(eq(nodes.deviceId, deviceId));
    await db.delete(channels).where(eq(channels.deviceId, deviceId));
    await db.delete(messageDrafts).where(eq(messageDrafts.deviceId, deviceId));
    await db.delete(lastRead).where(eq(lastRead.deviceId, deviceId));

    console.log(`[Migration] Deleted all data for device ${deviceId}`);
  }

  /**
   * Check if device data exists in SQL
   */
  static async hasDeviceData(deviceId: number): Promise<boolean> {
    await dbClient.init();
    const db = dbClient.db;

    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.deviceId, deviceId))
      .limit(1);

    return result.length > 0;
  }
}
