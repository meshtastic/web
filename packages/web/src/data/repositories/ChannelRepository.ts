import { and, asc, eq } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { type Channel, channels, type NewChannel } from "../schema.ts";

export class ChannelRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  buildChannelsQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.ownerNodeNum, ownerNodeNum));
  }

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

  buildPrimaryChannelQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.ownerNodeNum, ownerNodeNum),
          eq(channels.role, 1),
        ),
      )
      .limit(1);
  }

  async getChannels(ownerNodeNum: number): Promise<Channel[]> {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.ownerNodeNum, ownerNodeNum))
      .orderBy(asc(channels.channelIndex));
  }

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

  async upsertChannel(channel: NewChannel): Promise<void> {
    const existing = await this.getChannel(
      channel.ownerNodeNum,
      channel.channelIndex,
    );

    if (existing) {
      const { createdAt, ...updateData } = channel;
      await this.db
        .update(channels)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(channels.ownerNodeNum, channel.ownerNodeNum),
            eq(channels.channelIndex, channel.channelIndex),
          ),
        );
    } else {
      await this.db.insert(channels).values({
        ...channel,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

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

  async getPrimaryChannel(ownerNodeNum: number): Promise<Channel | undefined> {
    const result = await this.db
      .select()
      .from(channels)
      .where(and(eq(channels.ownerNodeNum, ownerNodeNum), eq(channels.role, 1)))
      .limit(1);

    return result[0];
  }

  async getEnabledChannels(ownerNodeNum: number): Promise<Channel[]> {
    return this.db
      .select()
      .from(channels)
      .where(eq(channels.ownerNodeNum, ownerNodeNum))
      .orderBy(asc(channels.channelIndex));
  }
}
