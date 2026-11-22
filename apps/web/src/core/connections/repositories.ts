import type { SessionOptions } from "@core/kmp/session.ts";
import { getSdkStorage, resetSdkStorage } from "@core/kmp/browserStorage.ts";
import type { SdkStorage } from "@meshtastic/sdk-kmp";
import { createLogger } from "@core/log.ts";
import { coordinator, getStorageDb } from "@core/sdkStorage.ts";
import { SqlocalDraftRepository } from "@core/storage/drafts.ts";
import { SqlocalMessageFilterRepository } from "@core/storage/messageFilter.ts";
import { SqlocalMessageRepository } from "@core/storage/messages.ts";
import { SqlocalNodesRepository } from "@core/storage/nodes.ts";
import {
  adoptProvisionalRows,
  discardStatements,
  type RunAtomically,
} from "@core/storage/adopt.ts";
import {
  isProvisionalScope,
  provisionalScopeId,
  type ScopeMoveError,
  StorageScope,
} from "@core/storage/scope.ts";
import { SqlocalTelemetryRepository } from "@core/storage/telemetry.ts";
import { Result } from "better-result";

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
 * Where one connection's history goes. History belongs to the radio, not
 * the transport: every table is keyed by the radio's node number, so Serial,
 * Bluetooth and HTTP connections to one radio share messages, reactions,
 * read markers, drafts, nodes and telemetry.
 *
 * A connection learns which radio it reached only from the handshake, and
 * the transport alone can't tell (a port or address may now lead to another
 * radio). Rather than hold writes until then, which would stall the chat's
 * write queue and anything waiting on it, the connection writes under a
 * provisional scope of its own, and `identify` adopts those rows into the
 * radio's history in one transaction. Nothing is written under the node the
 * connection reached last time, so a different radio on the same port can't
 * leak into that one's history, and adoption only ever moves this
 * connection's provisional rows (see `checkScopeMove`).
 */
export interface RadioStorage {
  readonly scope: StorageScope;
  /**
   * Files the connection's history under `nodeNum` from now on. The first
   * call adopts what was written before it; a later one with another node
   * (the session reached a different radio) leaves earlier rows where they
   * are. Every repository call made after this one sees the result.
   */
  identify(nodeNum: number): Promise<Result<void, ScopeMoveError>>;
  /** Drops what the connection wrote if it never learned its radio. */
  discard(): Promise<void>;
}

export function radioStorage(
  scope: StorageScope,
  atomic: RunAtomically,
): RadioStorage {
  return {
    scope,
    identify: (nodeNum) => {
      if (scope.provisional) {
        return scope.moveTo(nodeNum, (from, to) =>
          adoptProvisionalRows(atomic, from, to),
        );
      }
      scope.set(nodeNum);
      return Promise.resolve(Result.ok(undefined));
    },
    discard: async () => {
      if (!scope.provisional) return;
      await scope
        .exclusive(async (deviceId) => {
          // Named meanwhile: those rows are the radio's now.
          if (isProvisionalScope(deviceId)) {
            await atomic(discardStatements(deviceId));
          }
        })
        .catch((err: unknown) =>
          log.warn("discard: could not drop provisional rows", {
            message: err instanceof Error ? err.message : String(err),
          }),
        );
    },
  };
}

/**
 * Opens the message, draft, node and telemetry repositories against the
 * shared OPFS-backed SQLite DB, under a provisional scope until the
 * handshake names the radio (see `RadioStorage`). If sqlocal is
 * unavailable, hangs longer than `STORAGE_OPEN_TIMEOUT_MS`, or fails, the
 * session runs without persistence, `persistent` is false and `radio` is
 * undefined. The SDK's own storage comes from `getSdkStorage()`
 * independently of that, and is keyed by node number too; `sdkStorage` is
 * undefined only when it cannot be created, so the SDK keeps its state in
 * memory.
 */
export async function openRepositories(): Promise<{
  options: SessionOptions;
  persistent: boolean;
  sdkStorage: SdkStorage | undefined;
  radio?: RadioStorage;
}> {
  // The SDK bounds each storage call itself, but loading it is a plain
  // await; a connect must not wait on it forever, nor reuse a stuck one.
  let sdkTimer: ReturnType<typeof setTimeout> | undefined;
  const sdkStorage = await Promise.race([
    getSdkStorage(),
    new Promise<never>((_, reject) => {
      sdkTimer = setTimeout(() => {
        resetSdkStorage();
        reject(
          new Error(
            `SDK storage did not open within ${STORAGE_OPEN_TIMEOUT_MS}ms`,
          ),
        );
      }, STORAGE_OPEN_TIMEOUT_MS);
    }),
  ])
    .catch((err: unknown) => {
      log.warn("openRepositories: SDK storage unavailable, running in memory", {
        name: err instanceof Error ? err.name : undefined,
        message: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    })
    .finally(() => clearTimeout(sdkTimer));
  try {
    const t0 = Date.now();
    const { db, persistent, atomic } = await Promise.race([
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
    const scope = new StorageScope(provisionalScopeId());
    return {
      persistent,
      sdkStorage,
      radio: radioStorage(scope, atomic),
      options: {
        messages: new SqlocalMessageRepository(db, { scope, coordinator }),
        drafts: new SqlocalDraftRepository(db, { scope }),
        messageFilter: new SqlocalMessageFilterRepository(db, { scope }),
        nodes: new SqlocalNodesRepository(db, { scope }),
        telemetry: new SqlocalTelemetryRepository(db, { scope }),
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
