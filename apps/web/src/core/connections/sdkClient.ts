import { coordinator, getStorageDb } from "@core/sdkStorage.ts";
import type { ConnectionId } from "@core/stores/deviceStore/types";
import { createLogger, DeviceStatusEnum, MeshDevice } from "@meshtastic/sdk";
import {
  SqlocalDraftRepository,
  SqlocalMessageRepository,
} from "@meshtastic/sdk-storage-sqlocal/chat";
import { SqlocalNodesRepository } from "@meshtastic/sdk-storage-sqlocal/nodes";
import { SqlocalTelemetryRepository } from "@meshtastic/sdk-storage-sqlocal/telemetry";
import { SqlocalNodeMetricsRepository } from "@meshtastic/sdk-storage-sqlocal/nodeMetrics";
import { attachNodeMetricsRecorder } from "./nodeMetricsRecorder.ts";
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
const NODE_METRICS_RETENTION = {
  maxPerMetric: 1000,
  olderThanMs: 1000 * 60 * 60 * 24 * 30,
} as const;
const STORAGE_OPEN_TIMEOUT_MS = 5000;

/**
 * Builds a MeshDevice wired with persistence repositories opened against the
 * shared OPFS-backed SQLite DB. If sqlocal is unavailable, hangs longer than
 * `STORAGE_OPEN_TIMEOUT_MS`, or fails for any reason, falls through to the
 * SDK's in-memory repositories so the connect path is never blocked by
 * persistence.
 */
export async function buildMeshDevice(
  connectionId: ConnectionId,
  deviceId: number,
  transport: AnyTransport,
): Promise<MeshDevice> {
  log.debug("buildMeshDevice: enter", { connectionId, deviceId });
  let chatRepository: SqlocalMessageRepository | undefined;
  let draftRepository: SqlocalDraftRepository | undefined;
  let nodesRepository: SqlocalNodesRepository | undefined;
  let telemetryRepository: SqlocalTelemetryRepository | undefined;
  let nodeMetricsRepository: SqlocalNodeMetricsRepository | undefined;
  try {
    const t0 = Date.now();
    const db = await Promise.race([
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
    log.debug("buildMeshDevice: storage DB ready", { ms: Date.now() - t0 });
    chatRepository = new SqlocalMessageRepository(db, {
      deviceId: connectionId,
      coordinator,
    });
    draftRepository = new SqlocalDraftRepository(db, {
      deviceId: connectionId,
    });
    nodesRepository = new SqlocalNodesRepository(db, {
      deviceId: connectionId,
    });
    telemetryRepository = new SqlocalTelemetryRepository(db, {
      deviceId: connectionId,
    });
    nodeMetricsRepository = new SqlocalNodeMetricsRepository(db, {
      deviceId: connectionId,
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

  // The node-metrics recorder has no SDK client of its own — it subscribes to
  // the mesh client's event bus and persists directly. Detached on disconnect.
  if (nodeMetricsRepository) {
    const detach = attachNodeMetricsRecorder(
      meshDevice.meshClient,
      nodeMetricsRepository,
      { retention: NODE_METRICS_RETENTION },
    );
    meshDevice.meshClient.events.onDeviceStatus.subscribe((status) => {
      if (status === DeviceStatusEnum.DeviceDisconnected) detach();
    });
  }

  return meshDevice;
}
