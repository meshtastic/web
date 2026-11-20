import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf, Types } from "@core/protobuf.ts";
import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import type { SqlocalDb } from "./db.ts";
import { SqlocalDeviceStorage } from "./deviceStorage.ts";
import { SqlocalDraftRepository } from "./drafts.ts";
import { SqlocalMessageRepository } from "./messages.ts";
import { SqlocalNodesRepository } from "./nodes.ts";
import * as schema from "./schema.ts";
import { MIGRATIONS } from "./schema.ts";
import { SqlocalTelemetryRepository } from "./telemetry.ts";
import { base64Encode, MessageState } from "./types.ts";

const NODE = 0x0a0b0c0d;
const PEER = 0x11223344;

/**
 * A database as the TypeScript SDK's sqlocal adapter left it (schema v4),
 * with the rows it wrote under `device_id = <node number>`.
 */
async function legacyDb(): Promise<{
  db: SqlocalDb;
  migrate: () => void;
}> {
  const SQL = await initSqlJs({});
  const sqlite = new SQL.Database();
  const legacy = MIGRATIONS.filter((m) => m.version <= 4);
  const later = MIGRATIONS.filter((m) => m.version > 4);
  for (const migration of legacy) {
    for (const statement of migration.sql) sqlite.run(statement);
    sqlite.run("INSERT OR IGNORE INTO _schema (version) VALUES (?)", [
      migration.version,
    ]);
  }
  sqlite.run(
    `INSERT INTO messages (id, device_id, conversation_key, from_node, to_node, channel, rx_time, type, text, state, signed, relays)
     VALUES (42, ?, 'direct:${PEER}', ?, ?, 0, 1700000000000, 'direct', 'old hello', 'ack', 1, 2)`,
    [NODE, PEER, NODE],
  );
  sqlite.run(
    `INSERT INTO messages (id, device_id, conversation_key, from_node, to_node, channel, rx_time, type, text, state)
     VALUES (43, ?, 'channel:0', ?, 4294967295, 0, 1700000001000, 'broadcast', 'old all', 'delivered')`,
    [NODE, NODE],
  );
  sqlite.run(
    `INSERT INTO drafts (device_id, conversation_key, text, updated_at) VALUES (?, 'direct:${PEER}', 'unsent', 1)`,
    [NODE],
  );
  const user = base64Encode(
    toBinary(
      Protobuf.Mesh.UserSchema,
      create(Protobuf.Mesh.UserSchema, { longName: "Peer", shortName: "PR" }),
    ),
  );
  const position = base64Encode(
    toBinary(
      Protobuf.Mesh.PositionSchema,
      create(Protobuf.Mesh.PositionSchema, { latitudeI: 123, longitudeI: 456 }),
    ),
  );
  sqlite.run(
    `INSERT INTO nodes (device_id, num, last_heard, snr, is_favorite, is_ignored, user_json, position_json, metrics_json)
     VALUES (?, ?, 1700000000, 7, 1, 0, ?, ?, NULL)`,
    [NODE, PEER, user, position],
  );
  const metrics = base64Encode(
    toBinary(
      Protobuf.Telemetry.DeviceMetricsSchema,
      create(Protobuf.Telemetry.DeviceMetricsSchema, { batteryLevel: 88 }),
    ),
  );
  sqlite.run(
    `INSERT INTO telemetry (device_id, node_num, kind, ts, payload_json) VALUES (?, ?, 'deviceMetrics', 1700000002000, ?)`,
    [NODE, PEER, metrics],
  );
  const db: SqlocalDb = drizzle(sqlite, { schema, casing: "snake_case" });
  return {
    db,
    migrate: () => {
      for (const migration of later) {
        for (const statement of migration.sql) sqlite.run(statement);
        sqlite.run("INSERT OR IGNORE INTO _schema (version) VALUES (?)", [
          migration.version,
        ]);
      }
    },
  };
}

describe("rows written by the TypeScript SDK storage", () => {
  it("stay readable under the same node-number key after the SDK storage migration", async () => {
    const { db, migrate } = await legacyDb();
    migrate();

    const messages = new SqlocalMessageRepository(db, { deviceId: NODE });
    const direct = await messages.loadRecent(
      { kind: "direct", peer: PEER },
      10,
    );
    expect(direct).toMatchObject([
      {
        id: 42,
        from: PEER,
        to: NODE,
        text: "old hello",
        state: MessageState.Ack,
        signed: true,
        relays: 2,
        channel: Types.ChannelNumber.Primary,
      },
    ]);
    expect(direct[0]?.rxTime.getTime()).toBe(1700000000000);
    const broadcast = await messages.loadRecent(
      { kind: "channel", channel: Types.ChannelNumber.Primary },
      10,
    );
    expect(broadcast.map((m) => [m.text, m.state])).toEqual([
      ["old all", MessageState.Delivered],
    ]);

    const drafts = new SqlocalDraftRepository(db, { deviceId: NODE });
    expect(await drafts.load({ kind: "direct", peer: PEER })).toBe("unsent");

    const nodes = new SqlocalNodesRepository(db, { deviceId: NODE });
    const node = await nodes.get(PEER);
    expect(node?.user?.longName).toBe("Peer");
    expect(node?.position?.latitudeI).toBe(123);
    expect(node?.isFavorite).toBe(true);
    expect(node?.lastHeard).toBe(1700000000);

    const telemetry = new SqlocalTelemetryRepository(db, { deviceId: NODE });
    const readings = await telemetry.loadRecent(PEER, 10);
    expect(readings.map((r) => r.kind)).toEqual(["deviceMetrics"]);
    expect(
      readings[0]?.value?.$typeName === "meshtastic.DeviceMetrics"
        ? readings[0].value.batteryLevel
        : undefined,
    ).toBe(88);

    // The SDK's node DB sees the old row as a NodeInfo until it rewrites it.
    const storage = new SqlocalDeviceStorage(db, NODE);
    const infos = (await storage.loadNodes()).map((bytes) =>
      fromBinary(Protobuf.Mesh.NodeInfoSchema, bytes),
    );
    expect(infos.map((n) => [n.num, n.user?.shortName, n.snr])).toEqual([
      [PEER, "PR", 7],
    ]);
    expect(await storage.loadConfig()).toBeNull();
    expect(await storage.loadHeartbeats()).toEqual([]);
  });

  it("is not visible under another node's key", async () => {
    const { db, migrate } = await legacyDb();
    migrate();
    const other = new SqlocalMessageRepository(db, { deviceId: NODE + 1 });
    expect(await other.loadRecent({ kind: "direct", peer: PEER }, 10)).toEqual(
      [],
    );
  });
});
