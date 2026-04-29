import { createLogger } from "@meshtastic/sdk";
import {
  createSqlocalDb,
  MultiTabCoordinator,
  type SqlocalDb,
} from "@meshtastic/sdk-storage-sqlocal";

const log = createLogger("sdkStorage");

/**
 * Lazy singletons for the chat (and future nodes/telemetry) persistence layer.
 *
 * `getStorageDb()` opens the OPFS-backed SQLite database on first call and
 * returns the same Drizzle client on subsequent calls. `coordinator` is a
 * shared `MultiTabCoordinator` for cross-tab change broadcasts.
 *
 * The database is opened only when a feature actually needs it; importing
 * this module is side-effect-free so unit tests that don't touch storage
 * stay fast and headless-safe.
 */
let dbPromise: Promise<SqlocalDb> | undefined;

export function getStorageDb(): Promise<SqlocalDb> {
  if (!dbPromise) {
    log.debug("getStorageDb: creating sqlocal DB", { path: "meshtastic.db" });
    const t0 = Date.now();
    dbPromise = createSqlocalDb({ databasePath: "meshtastic.db" })
      .then((db) => {
        log.info("getStorageDb: sqlocal DB ready", { ms: Date.now() - t0 });
        return db;
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

export const coordinator = new MultiTabCoordinator();
