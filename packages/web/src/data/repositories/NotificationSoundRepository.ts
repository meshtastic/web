import { eq } from "drizzle-orm";
import { dbClient } from "../client.ts";
import { notificationSounds } from "../schema.ts";

export class NotificationSoundRepository {
  private get db() {
    return dbClient.db;
  }

  async getBySlot(slot: string) {
    const result = await this.db
      .select()
      .from(notificationSounds)
      .where(eq(notificationSounds.slot, slot))
      .limit(1);

    return result[0];
  }

  async getAllSlots() {
    return this.db.select().from(notificationSounds);
  }

  async upsert(
    slot: string,
    name: string,
    mimeType: string,
    data: string,
    size: number,
  ) {
    await this.db
      .insert(notificationSounds)
      .values({
        slot,
        name,
        mimeType,
        data,
        size,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationSounds.slot,
        set: {
          name,
          mimeType,
          data,
          size,
          updatedAt: new Date(),
        },
      });
  }

  async deleteBySlot(slot: string) {
    await this.db
      .delete(notificationSounds)
      .where(eq(notificationSounds.slot, slot));
  }
}
