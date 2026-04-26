import { coordinator, getStorageDb } from "@core/sdkStorage.ts";
import type { ConnectionId } from "@core/stores/deviceStore/types";
import { MeshDevice } from "@meshtastic/sdk";
import {
  SqlocalDraftRepository,
  SqlocalMessageRepository,
} from "@meshtastic/sdk-storage-sqlocal/chat";
import { SqlocalNodesRepository } from "@meshtastic/sdk-storage-sqlocal/nodes";
import { SqlocalTelemetryRepository } from "@meshtastic/sdk-storage-sqlocal/telemetry";
import type { TransportHTTP } from "@meshtastic/transport-http";
import type { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import type { TransportWebSerial } from "@meshtastic/transport-web-serial";

export type AnyTransport =
  | Awaited<ReturnType<typeof TransportHTTP.create>>
  | Awaited<ReturnType<typeof TransportWebBluetooth.createFromDevice>>
  | Awaited<ReturnType<typeof TransportWebSerial.createFromPort>>;

const CHAT_RETENTION = { maxPerBucket: 1000, olderThanMs: 1000 * 60 * 60 * 24 * 90 } as const;
const TELEMETRY_RETENTION = { maxPerNode: 500, olderThanMs: 1000 * 60 * 60 * 24 * 30 } as const;

/**
 * Builds a MeshDevice wired with persistence repositories opened against the
 * shared OPFS-backed SQLite DB. If sqlocal is unavailable the SDK falls back
 * to its in-memory repositories transparently.
 */
export async function buildMeshDevice(
  connectionId: ConnectionId,
  deviceId: number,
  transport: AnyTransport,
): Promise<MeshDevice> {
  let chatRepository: SqlocalMessageRepository | undefined;
  let draftRepository: SqlocalDraftRepository | undefined;
  let nodesRepository: SqlocalNodesRepository | undefined;
  let telemetryRepository: SqlocalTelemetryRepository | undefined;
  try {
    const db = await getStorageDb();
    chatRepository = new SqlocalMessageRepository(db, { deviceId: connectionId, coordinator });
    draftRepository = new SqlocalDraftRepository(db, { deviceId: connectionId });
    nodesRepository = new SqlocalNodesRepository(db, { deviceId: connectionId });
    telemetryRepository = new SqlocalTelemetryRepository(db, { deviceId: connectionId });
  } catch (err) {
    console.warn("[sdkClient] sqlocal unavailable, falling back to in-memory:", err);
  }

  return new MeshDevice(transport, {
    configId: deviceId,
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
}
