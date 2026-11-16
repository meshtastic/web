import type { SessionOptions } from "@core/kmp/session.ts";
import { getSdkStorage } from "@core/kmp/browserStorage.ts";
import type { SdkStorage } from "@meshtastic/sdk-kmp";
import { createLogger } from "@core/log.ts";
import { coordinator, getStorageDb } from "@core/sdkStorage.ts";
import { SqlocalDraftRepository } from "@core/storage/drafts.ts";
import { SqlocalMessageRepository } from "@core/storage/messages.ts";
import { SqlocalNodesRepository } from "@core/storage/nodes.ts";
import { SqlocalTelemetryRepository } from "@core/storage/telemetry.ts";

const log = createLogger("repositories");

const CHAT_RETENTION = {
  maxPerBucket: 1000,
  olderThanMs: 1000 * 60 * 60 * 24 * 90,
};
const TELEMETRY_RETENTION = {
  maxPerNode: 500,
  olderThanMs: 1000 * 60 * 60 * 24 * 30,
};
const STORAGE_OPEN_TIMEOUT_MS = 5000;

/**
 * Storage scope used until the radio's node number is known. Node numbers
 * and connection ids are both unsigned 32-bit, so no stored row has it and
 * nothing is shown before the handshake names the radio.
 */
export const UNKNOWN_NODE_SCOPE = -1;

/**
 * Opens the message, draft, node and telemetry repositories against the
 * shared OPFS-backed SQLite DB, scoped to `nodeNum` (the node this
 * connection reached last time) so every connection to the same radio
 * shares one history. If sqlocal is unavailable, hangs longer than
 * `STORAGE_OPEN_TIMEOUT_MS`, or fails, the session runs without
 * persistence and `persistent` is false. The SDK's own storage comes from
 * `getSdkStorage()` independently of that; `sdkStorage` is undefined only
 * when it cannot be created, so the SDK keeps its state in memory.
 */
export async function openRepositories(nodeNum?: number): Promise<{
  options: SessionOptions;
  persistent: boolean;
  sdkStorage: SdkStorage | undefined;
}> {
  const sdkStorage = await getSdkStorage().catch((err: unknown) => {
    log.warn("openRepositories: SDK storage unavailable, running in memory", {
      name: err instanceof Error ? err.name : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  });
  const scope = nodeNum ?? UNKNOWN_NODE_SCOPE;
  try {
    const t0 = Date.now();
    const { db, persistent } = await Promise.race([
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
    log.debug("openRepositories: storage DB ready", {
      ms: Date.now() - t0,
      persistent,
    });
    return {
      persistent,
      sdkStorage,
      options: {
        messages: new SqlocalMessageRepository(db, {
          deviceId: scope,
          coordinator,
        }),
        drafts: new SqlocalDraftRepository(db, { deviceId: scope }),
        nodes: new SqlocalNodesRepository(db, { deviceId: scope }),
        telemetry: new SqlocalTelemetryRepository(db, { deviceId: scope }),
        chatRetention: CHAT_RETENTION,
        telemetryRetention: TELEMETRY_RETENTION,
      },
    };
  } catch (err) {
    log.warn("openRepositories: sqlocal unavailable, running in memory", {
      name: err instanceof Error ? err.name : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
    return { persistent: false, sdkStorage, options: {} };
  }
}
