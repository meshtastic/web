import { createLogger } from "@core/log.ts";
import { MultiTabCoordinator } from "@core/storage/coordinator.ts";
import { type OpenedSqlocalDb, openSqlocalDb } from "@core/storage/db.ts";
import { DATABASE_FILE } from "@core/storage/schema.ts";

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
let relinquished = false;

export function getStorageDb(): Promise<OpenedSqlocalDb> {
  if (relinquished) {
    return Promise.reject(
      new Error("storage was handed to another tab; not reopening"),
    );
  }
  if (!dbPromise) {
    log.debug("getStorageDb: creating sqlocal DB", { path: DATABASE_FILE });
    const t0 = Date.now();
    const opening: Promise<OpenedSqlocalDb> = openSqlocalDb({
      databasePath: DATABASE_FILE,
    })
      .then((opened) => {
        const ready = { ms: Date.now() - t0, storageType: opened.storageType };
        if (opened.persistent) {
          log.info("getStorageDb: sqlocal DB ready", ready);
          if (!relinquished) void removeLegacyDatabase();
        } else log.warn("getStorageDb: sqlocal DB is not persisted", ready);
        return opened;
      })
      .catch((err: unknown) => {
        log.error("getStorageDb: sqlocal DB open failed", {
          ms: Date.now() - t0,
          name: err instanceof Error ? err.name : undefined,
          message: err instanceof Error ? err.message : String(err),
        });
        // Forget the failure (e.g. another tab holding the file), so the
        // next call tries again rather than failing until a reload.
        if (dbPromise === opening) dbPromise = undefined;
        throw err;
      });
    dbPromise = opening;
  }
  return dbPromise;
}

/**
 * Closes the database and forgets it, so another tab can take the OPFS
 * handle and the next `getStorageDb()` here opens afresh. A failing close is
 * logged, not thrown: the caller is giving the app away and must finish.
 */
export async function closeStorageDb(): Promise<void> {
  relinquished = true;
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

/** This tab owns the app again: `getStorageDb()` may open the database. */
export function resumeStorageDb(): void {
  relinquished = false;
}

export const coordinator = new MultiTabCoordinator();

/** What older releases stored the app database as, before `DATABASE_FILE`. */
export const LEGACY_DATABASE_FILES = [
  "meshtastic.db",
  "meshtastic.db-journal",
  "meshtastic.db-wal",
] as const;

export interface RemovableDirectory {
  removeEntry(name: string): Promise<void>;
}

const opfsRoot = async (): Promise<RemovableDirectory | undefined> =>
  typeof navigator !== "undefined" &&
  typeof navigator.storage?.getDirectory === "function"
    ? navigator.storage.getDirectory()
    : undefined;

/**
 * Best-effort removal of the database older releases wrote, which nothing
 * reads any more. Only the tab that owns the app (and so opened storage)
 * gets here, and OPFS refuses to remove a file another tab still has open,
 * so an older tab in another window keeps its file. Never throws.
 */
export async function removeLegacyDatabase(
  root: () => Promise<RemovableDirectory | undefined> = opfsRoot,
): Promise<string[]> {
  const removed: string[] = [];
  try {
    const dir = await root();
    if (!dir) return removed;
    for (const name of LEGACY_DATABASE_FILES) {
      try {
        await dir.removeEntry(name);
        removed.push(name);
      } catch {
        // Missing, or still open in another tab: leave it.
      }
    }
    if (removed.length > 0) {
      log.info("removeLegacyDatabase: removed old database", { removed });
    }
  } catch (err) {
    log.debug("removeLegacyDatabase: skipped", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
  return removed;
}
