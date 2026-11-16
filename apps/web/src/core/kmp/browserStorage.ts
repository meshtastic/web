import type { SdkStorage } from "@meshtastic/sdk-kmp";
import workerUrl from "./sqliteWorker.ts?worker&url";
import { loadKmp } from "./client.ts";

const STORAGE_BASE_DIR = "meshtastic";
const STORAGE_TIMEOUT_MS = 5000;

let storage: Promise<SdkStorage> | undefined;

/**
 * Builds the URL of the SQLite worker for a database file, keeping any query
 * the bundler added (Vite dev appends `?worker_file&type=module`).
 */
export function sqliteWorkerUrl(
  workerUrl: string,
  dbFile: string,
  base: string,
): string {
  const url = new URL(workerUrl, base);
  const separator = url.search === "" ? "?" : "&";
  return `${url.href}${separator}db=${encodeURIComponent(dbFile)}`;
}

/** The SDK's browser SQLite storage, created once on first use. */
export function getSdkStorage(): Promise<SdkStorage> {
  storage ??= loadKmp().then((kmp) =>
    kmp.createBrowserStorage(
      STORAGE_BASE_DIR,
      (dbFile) =>
        new Worker(sqliteWorkerUrl(workerUrl, dbFile, location.href), {
          type: "module",
        }),
      STORAGE_TIMEOUT_MS,
    ),
  );
  return storage;
}

/** Forgets the cached storage so the next call creates a fresh one. */
export function resetSdkStorage(): void {
  storage = undefined;
}
