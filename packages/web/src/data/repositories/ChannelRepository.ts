import { and, asc, eq } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { type Channel, channels, type NewChannel } from "../schema.ts";

/**
 * Repository for channel operations
 */
export class ChannelRepository {
  private get db() {
    return dbClient.db;
  }

  /**
   * @param client - Optional client override for dependency injection
   */
  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  /**
   * Build a query to get all channels for a device
   */
  buildChannelsQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Build a query to get a specific channel
   */
  buildChannelQuery(ownerNodeNum: number, channelIndex: number) {
    return this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.ownerNodeNum, ownerNodeNum),
          eq(channels.channelIndex, channelIndex),
        ),
      )
      .limit(1);
  }

  /**
   * Build a query to get the primary channel
   */
  buildPrimaryChannelQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.ownerNodeNum, ownerNodeNum),
          eq(channels.role, 1), // PRIMARY = 1
        ),
      )
      .limit(1);
  }

  // ===================
  // execute queries
  // ===================

  /**
   * Get all channels for a device
   */
  async getChannels(ownerNodeNum: number): Promise<Channel[]> {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.ownerNodeNum, ownerNodeNum))
      .orderBy(asc(channels.channelIndex));
  }

  /**
   * Get a specific channel
   */
  async getChannel(
    ownerNodeNum: number,
    channelIndex: number,
  ): Promise<Channel | undefined> {
    const result = await this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.ownerNodeNum, ownerNodeNum),
          eq(channels.channelIndex, channelIndex),
        ),
      )
      .limit(1);

    return result[0];
  }

  /**
   * Upsert a channel (insert or update)
   */
  async upsertChannel(channel: NewChannel): Promise<void> {
    const existing = await this.getChannel(
      channel.ownerNodeNum,
      channel.channelIndex,
    );

    if (existing) {
      // Update
      await this.db
        .update(channels)
        .set({
          ...channel,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(channels.ownerNodeNum, channel.ownerNodeNum),
            eq(channels.channelIndex, channel.channelIndex),
          ),
        );
    } else {
      // Insert
      await this.db.insert(channels).values(channel);
    }
  }

  /**
   * Delete a channel
   */
  async deleteChannel(
    ownerNodeNum: number,
    channelIndex: number,
  ): Promise<void> {
    await this.db
      .delete(channels)
      .where(
        and(
          eq(channels.ownerNodeNum, ownerNodeNum),
          eq(channels.channelIndex, channelIndex),
        ),
      );
  }

  /**
   * Get primary channel
   */
  async getPrimaryChannel(ownerNodeNum: number): Promise<Channel | undefined> {
    const result = await this.db
      .select()
      .from(channels)
      .where(and(eq(channels.ownerNodeNum, ownerNodeNum), eq(channels.role, 1))) // PRIMARY = 1
      .limit(1);

    return result[0];
  }

  /**
   * Get enabled channels (non-disabled)
   */
  async getEnabledChannels(ownerNodeNum: number): Promise<Channel[]> {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.ownerNodeNum, ownerNodeNum))
      .orderBy(asc(channels.channelIndex));
    // Note: Filter out role = 0 (DISABLED) in application code if needed
  }
}
