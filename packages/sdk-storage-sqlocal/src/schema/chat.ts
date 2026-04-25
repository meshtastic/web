import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable(
  "messages",
  {
    /**
     * Composite primary key would be ideal, but Meshtastic packet IDs are
     * already 32-bit random values; collisions across devices are rare. We
     * scope reads by (device_id, conversation_key) so collisions only
     * matter within a single device's history.
     */
    id: integer("id").notNull(),
    deviceId: integer("device_id").notNull(),
    conversationKey: text("conversation_key").notNull(),
    fromNode: integer("from_node").notNull(),
    toNode: integer("to_node").notNull(),
    channel: integer("channel").notNull(),
    rxTime: integer("rx_time").notNull(),
    type: text("type", { enum: ["broadcast", "direct"] }).notNull(),
    text: text("text").notNull(),
    state: text("state", { enum: ["pending", "ack", "failed"] }).notNull(),
  },
  (t) => ({
    pk: index("messages_pk").on(t.deviceId, t.id),
    convRxTime: index("idx_messages_conv_rxtime").on(t.deviceId, t.conversationKey, t.rxTime),
    pending: index("idx_messages_pending").on(t.deviceId, t.state),
  }),
);

export type MessageRow = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;
