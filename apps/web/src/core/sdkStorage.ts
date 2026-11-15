import { createLogger } from "@core/log.ts";
import { MultiTabCoordinator } from "@core/storage/coordinator.ts";
import { type OpenedSqlocalDb, openSqlocalDb } from "@core/storage/db.ts";

const log = createLogger("sdkStorage");

/**
 * Lazy singletons for the chat (and future nodes/telemetry) persistence layer.
 *
 * `getStorageDb()` opens the OPFS-backed SQLite database on first call and
 * returns the same Drizzle client, and whether it is really saved to OPFS,
 * on subsequent calls. `coordinator` is a
 * shared `MultiTabCoordinator` for cross-tab change broadcasts.
 *
 * The database is opened only when a feature actually needs it; importing
 * this module is side-effect-free so unit tests that don't touch storage
 * stay fast and headless-safe.
 */
let dbPromise: Promise<OpenedSqlocalDb> | undefined;

export function getStorageDb(): Promise<OpenedSqlocalDb> {
  if (!dbPromise) {
    log.debug("getStorageDb: creating sqlocal DB", { path: "meshtastic.db" });
    const t0 = Date.now();
    dbPromise = openSqlocalDb({ databasePath: "meshtastic.db" })
      .then((opened) => {
        const ready = { ms: Date.now() - t0, storageType: opened.storageType };
        if (opened.persistent)
          log.info("getStorageDb: sqlocal DB ready", ready);
        else log.warn("getStorageDb: sqlocal DB is not persisted", ready);
        return opened;
      })
      .catch((err) => {
        const e = err as Error;
        log.error("getStorageDb: sqlocal DB open failed", {
          ms: Date.now() - t0,
          name: e?.name,
          message: e?.message,
        });
        throw err;
      });
  }
  return dbPromise;
}

/**
 * Closes the database and forgets it, so another tab can take the OPFS
 * handle and the next `getStorageDb()` here opens afresh. A failing close is
 * logged, not thrown: the caller is giving the app away and must finish.
 */
export async function closeStorageDb(): Promise<void> {
  const pending = dbPromise;
  if (!pending) return;
  dbPromise = undefined;
  try {
    const opened = await pending;
    await opened.close();
    log.info("closeStorageDb: sqlocal DB closed");
  } catch (err) {
    log.warn("closeStorageDb: close failed", {
      name: err instanceof Error ? err.name : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export const coordinator = new MultiTabCoordinator();
