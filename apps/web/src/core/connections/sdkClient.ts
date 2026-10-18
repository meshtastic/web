import { coordinator, getStorageDb } from "@core/sdkStorage.ts";
import type { ConnectionId } from "@core/stores/deviceStore/types";
import { createLogger, MeshDevice } from "@meshtastic/sdk";
import {
  SqlocalDraftRepository,
  SqlocalMessageRepository,
} from "@meshtastic/sdk-storage-sqlocal/chat";
import { SqlocalNodesRepository } from "@meshtastic/sdk-storage-sqlocal/nodes";
import { SqlocalTelemetryRepository } from "@meshtastic/sdk-storage-sqlocal/telemetry";
import type { TransportHTTP } from "@meshtastic/transport-http";
import type { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import type { TransportWebSerial } from "@meshtastic/transport-web-serial";

const log = createLogger("sdkClient");

export type AnyTransport =
  | TransportHTTP
  | TransportWebBluetooth
  | TransportWebSerial;

const CHAT_RETENTION = {
  maxPerBucket: 1000,
  olderThanMs: 1000 * 60 * 60 * 24 * 90,
} as const;
const TELEMETRY_RETENTION = {
  maxPerNode: 500,
  olderThanMs: 1000 * 60 * 60 * 24 * 30,
} as const;
const STORAGE_OPEN_TIMEOUT_MS = 5000;

/**
 * Storage scope used until the radio's node number is known. Node numbers
 * and connection ids are both unsigned 32-bit, so no stored row has it and
 * nothing is shown before the handshake names the radio.
 */
export const UNKNOWN_NODE_SCOPE = -1;

/**
 * Builds a MeshDevice wired with persistence repositories opened against the
 * shared OPFS-backed SQLite DB.
 *
 * History is stored per radio, not per saved connection: the repositories
 * are scoped to `nodeNum` (the node this connection reached last time), so
 * serial, Bluetooth and HTTP connections to the same radio share messages,
 * drafts, nodes and telemetry. When `nodeNum` is unknown, or the radio turns
 * out to be a different node, the SDK rescopes to the node number my_info
 * reports (`storageScope: "node"`).
 *
 * Rows written before this was per node sit under the connection id in the
 * same `device_id` column and are no longer read. Connection ids come from
 * `randId()`, a uniformly random unsigned 32-bit integer, and node numbers
 * are unsigned 32-bit too, so a given id matches a given node number with
 * odds of 1 in 2^32 (about 4.3 billion). If it did, that node's history
 * would also show the old rows of that one connection; nothing is lost.
 * If sqlocal is unavailable, hangs longer than
 * `STORAGE_OPEN_TIMEOUT_MS`, or fails for any reason, falls through to the
 * SDK's in-memory repositories so the connect path is never blocked by
 * persistence. `persistent` is false then: nothing from this session will
 * be saved.
 */
export async function buildMeshDevice(
  connectionId: ConnectionId,
  deviceId: number,
  transport: AnyTransport,
  nodeNum?: number,
): Promise<{ meshDevice: MeshDevice; persistent: boolean }> {
  log.debug("buildMeshDevice: enter", { connectionId, deviceId, nodeNum });
  const scope = nodeNum ?? UNKNOWN_NODE_SCOPE;
  let chatRepository: SqlocalMessageRepository | undefined;
  let draftRepository: SqlocalDraftRepository | undefined;
  let nodesRepository: SqlocalNodesRepository | undefined;
  let telemetryRepository: SqlocalTelemetryRepository | undefined;
  let persistent = false;
  try {
    const t0 = Date.now();
    const { db, persistent: saved } = await Promise.race([
      getStorageDb(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `sqlocal DB open did not resolve within ${STORAGE_OPEN_TIMEOUT_MS}ms`,
              ),
            ),
          STORAGE_OPEN_TIMEOUT_MS,
        ),
      ),
    ]);
    persistent = saved;
    log.debug("buildMeshDevice: storage DB ready", {
      ms: Date.now() - t0,
      persistent,
    });
    chatRepository = new SqlocalMessageRepository(db, {
      deviceId: scope,
      coordinator,
    });
    draftRepository = new SqlocalDraftRepository(db, {
      deviceId: scope,
    });
    nodesRepository = new SqlocalNodesRepository(db, {
      deviceId: scope,
    });
    telemetryRepository = new SqlocalTelemetryRepository(db, {
      deviceId: scope,
    });
    log.debug("buildMeshDevice: repositories opened");
  } catch (err) {
    const e = err as Error;
    log.warn(
      "buildMeshDevice: sqlocal unavailable, falling back to in-memory",
      {
        name: e?.name,
        message: e?.message,
      },
    );
  }

  const meshDevice = new MeshDevice(transport, {
    configId: deviceId,
    storageScope: "node",
    storageNodeNum: nodeNum,
    chat:
      chatRepository || draftRepository
        ? {
            repository: chatRepository,
            draftRepository,
            retention: CHAT_RETENTION,
          }
        : undefined,
    nodes: nodesRepository ? { repository: nodesRepository } : undefined,
    telemetry: telemetryRepository
      ? { repository: telemetryRepository, retention: TELEMETRY_RETENTION }
      : undefined,
  });
  return { meshDevice, persistent };
}
