import {
  createSqlocalDb,
  MultiTabCoordinator,
  type SqlocalDb,
} from "@meshtastic/sdk-storage-sqlocal";

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
    dbPromise = createSqlocalDb({ databasePath: "meshtastic.db" });
  }
  return dbPromise;
}

export const coordinator = new MultiTabCoordinator();
