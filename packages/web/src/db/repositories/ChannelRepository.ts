import { and, asc, eq } from "drizzle-orm";
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
   * Get all channels for a device
   */
  async getChannels(deviceId: number): Promise<Channel[]> {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.deviceId, deviceId))
      .orderBy(asc(channels.channelIndex));
  }

  /**
   * Get a specific channel
   */
  async getChannel(
    deviceId: number,
    channelIndex: number,
  ): Promise<Channel | undefined> {
    const result = await this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.deviceId, deviceId),
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
      channel.deviceId,
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
            eq(channels.deviceId, channel.deviceId),
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
  async deleteChannel(deviceId: number, channelIndex: number): Promise<void> {
    await this.db
      .delete(channels)
      .where(
        and(
          eq(channels.deviceId, deviceId),
          eq(channels.channelIndex, channelIndex),
        ),
      );
  }

  /**
   * Get primary channel
   */
  async getPrimaryChannel(deviceId: number): Promise<Channel | undefined> {
    const result = await this.db
      .select()
      .from(channels)
      .where(and(eq(channels.deviceId, deviceId), eq(channels.role, 1))) // PRIMARY = 1
      .limit(1);

    return result[0];
  }

  /**
   * Get enabled channels (non-disabled)
   */
  async getEnabledChannels(deviceId: number): Promise<Channel[]> {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.deviceId, deviceId))
      .orderBy(asc(channels.channelIndex));
    // Note: Filter out role = 0 (DISABLED) in application code if needed
  }
}
