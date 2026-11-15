import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import type {
  ConfigBundleJs,
  DeviceStorageJs,
  HeartbeatJs,
  PasskeyJs,
  StorageJs,
} from "@meshtastic/sdk-kmp";
import { and, eq } from "drizzle-orm";
import type { SqlocalDb } from "./db.ts";
import {
  nodes,
  sdkChannels,
  sdkConfig,
  sdkHeartbeats,
  sdkOwnNode,
  sdkPasskey,
} from "./schema.ts";
import { base64Decode, base64Encode } from "./types.ts";

/**
 * The Kotlin SDK's DeviceStorage over the shared sqlocal DB. Rows are
 * keyed by node number, like the web's own history, so every connection to
 * the same radio shares them: the scope starts as the node this connection
 * reached last time and moves to the node the handshake names.
 */
export class SqlocalDeviceStorage implements DeviceStorageJs {
  private scope: number;

  constructor(
    private readonly db: SqlocalDb,
    scope: number,
  ) {
    this.scope = scope;
  }

  get currentScope(): number {
    return this.scope;
  }

  async loadNodes(): Promise<Uint8Array[]> {
    const rows = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.deviceId, this.scope));
    return rows.map((row) =>
      row.nodeInfo
        ? base64Decode(row.nodeInfo)
        : toBinary(Protobuf.Mesh.NodeInfoSchema, legacyNodeInfo(row)),
    );
  }

  async saveNode(bytes: Uint8Array): Promise<void> {
    const info = fromBinary(Protobuf.Mesh.NodeInfoSchema, bytes);
    const row = {
      deviceId: this.scope,
      num: info.num,
      lastHeard: info.lastHeard || null,
      snr: info.snr || null,
      isFavorite: info.isFavorite,
      isIgnored: info.isIgnored,
      userJson: info.user
        ? base64Encode(toBinary(Protobuf.Mesh.UserSchema, info.user))
        : null,
      positionJson: info.position
        ? base64Encode(toBinary(Protobuf.Mesh.PositionSchema, info.position))
        : null,
      metricsJson: info.deviceMetrics
        ? base64Encode(
            toBinary(
              Protobuf.Telemetry.DeviceMetricsSchema,
              info.deviceMetrics,
            ),
          )
        : null,
      nodeInfo: base64Encode(bytes),
    };
    await this.db
      .insert(nodes)
      .values(row)
      .onConflictDoUpdate({ target: [nodes.deviceId, nodes.num], set: row });
  }

  async removeNode(nodeNum: number): Promise<void> {
    await this.db
      .delete(nodes)
      .where(and(eq(nodes.deviceId, this.scope), eq(nodes.num, nodeNum)));
  }

  async loadConfig(): Promise<ConfigBundleJs | null> {
    const rows = await this.db
      .select()
      .from(sdkConfig)
      .where(eq(sdkConfig.deviceId, this.scope))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      myInfo: base64Decode(row.myInfo),
      metadata: base64Decode(row.metadata),
      configs: decodeList(row.configs),
      moduleConfigs: decodeList(row.moduleConfigs),
      deviceUiConfig: row.deviceUiConfig
        ? base64Decode(row.deviceUiConfig)
        : null,
    };
  }

  async saveConfig(bundle: ConfigBundleJs): Promise<void> {
    const row = {
      deviceId: this.scope,
      myInfo: base64Encode(bundle.myInfo),
      metadata: base64Encode(bundle.metadata),
      configs: encodeList(bundle.configs),
      moduleConfigs: encodeList(bundle.moduleConfigs),
      deviceUiConfig: bundle.deviceUiConfig
        ? base64Encode(bundle.deviceUiConfig)
        : null,
    };
    await this.db
      .insert(sdkConfig)
      .values(row)
      .onConflictDoUpdate({ target: sdkConfig.deviceId, set: row });
  }

  async loadChannels(): Promise<Uint8Array[]> {
    const rows = await this.db
      .select()
      .from(sdkChannels)
      .where(eq(sdkChannels.deviceId, this.scope))
      .orderBy(sdkChannels.idx);
    return rows.map((row) => base64Decode(row.channel));
  }

  async saveChannels(channels: Uint8Array[]): Promise<void> {
    await this.db
      .delete(sdkChannels)
      .where(eq(sdkChannels.deviceId, this.scope));
    if (channels.length === 0) return;
    await this.db.insert(sdkChannels).values(
      channels.map((bytes, idx) => ({
        deviceId: this.scope,
        idx,
        channel: base64Encode(bytes),
      })),
    );
  }

  /**
   * The handshake named the radio. History is keyed by node number, so a
   * different node means a different key space rather than a wipe.
   */
  async recordOwnNode(nodeNum: number, firmwareVersion: string): Promise<void> {
    this.scope = nodeNum;
    const row = { deviceId: nodeNum, nodeNum, firmwareVersion };
    await this.db
      .insert(sdkOwnNode)
      .values(row)
      .onConflictDoUpdate({ target: sdkOwnNode.deviceId, set: row });
  }

  async clear(): Promise<void> {
    const scope = this.scope;
    await this.db.delete(nodes).where(eq(nodes.deviceId, scope));
    await this.db.delete(sdkConfig).where(eq(sdkConfig.deviceId, scope));
    await this.db.delete(sdkChannels).where(eq(sdkChannels.deviceId, scope));
    await this.db
      .delete(sdkHeartbeats)
      .where(eq(sdkHeartbeats.deviceId, scope));
    await this.db.delete(sdkPasskey).where(eq(sdkPasskey.deviceId, scope));
    await this.db.delete(sdkOwnNode).where(eq(sdkOwnNode.deviceId, scope));
  }

  close(): void {}

  async saveSessionPasskey(passkey: PasskeyJs): Promise<void> {
    const row = {
      deviceId: this.scope,
      passkey: base64Encode(passkey.bytes),
      expiresAt: passkey.expiresAtEpochMs,
    };
    await this.db
      .insert(sdkPasskey)
      .values(row)
      .onConflictDoUpdate({ target: sdkPasskey.deviceId, set: row });
  }

  async loadSessionPasskey(): Promise<PasskeyJs | null> {
    const rows = await this.db
      .select()
      .from(sdkPasskey)
      .where(eq(sdkPasskey.deviceId, this.scope))
      .limit(1);
    const row = rows[0];
    if (!row || row.expiresAt <= Date.now()) return null;
    return {
      bytes: base64Decode(row.passkey),
      expiresAtEpochMs: row.expiresAt,
    };
  }

  async saveHeartbeat(nodeNum: number, epochMillis: number): Promise<void> {
    const row = { deviceId: this.scope, nodeNum, epochMs: epochMillis };
    await this.db
      .insert(sdkHeartbeats)
      .values(row)
      .onConflictDoUpdate({
        target: [sdkHeartbeats.deviceId, sdkHeartbeats.nodeNum],
        set: { epochMs: epochMillis },
      });
  }

  async loadHeartbeats(): Promise<HeartbeatJs[]> {
    const rows = await this.db
      .select()
      .from(sdkHeartbeats)
      .where(eq(sdkHeartbeats.deviceId, this.scope));
    return rows.map((row) => ({
      nodeNum: row.nodeNum,
      epochMillis: row.epochMs,
    }));
  }
}

/** A NodeInfo from the columns the TypeScript SDK's repository wrote. */
function legacyNodeInfo(
  row: typeof nodes.$inferSelect,
): Protobuf.Mesh.NodeInfo {
  return create(Protobuf.Mesh.NodeInfoSchema, {
    num: row.num,
    user: row.userJson
      ? fromBinary(Protobuf.Mesh.UserSchema, base64Decode(row.userJson))
      : undefined,
    position: row.positionJson
      ? fromBinary(Protobuf.Mesh.PositionSchema, base64Decode(row.positionJson))
      : undefined,
    deviceMetrics: row.metricsJson
      ? fromBinary(
          Protobuf.Telemetry.DeviceMetricsSchema,
          base64Decode(row.metricsJson),
        )
      : undefined,
    lastHeard: row.lastHeard ?? 0,
    snr: row.snr ?? 0,
    isFavorite: row.isFavorite,
    isIgnored: row.isIgnored,
  });
}

function encodeList(items: ReadonlyArray<Uint8Array>): string {
  return JSON.stringify(items.map(base64Encode));
}

function decodeList(json: string): Uint8Array[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) =>
    typeof item === "string" ? [base64Decode(item)] : [],
  );
}

/** A `StorageJs` for the facade's factories, opening the DB on activation. */
export function sqlocalStorage(
  openDb: () => Promise<SqlocalDb>,
  scope: number,
): StorageJs {
  return {
    activate: async () => new SqlocalDeviceStorage(await openDb(), scope),
  };
}
