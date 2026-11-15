import { createLogger } from "@core/log.ts";

const log = createLogger("tabLock");

export const APP_LOCK_NAME = "meshtastic:web:app";
export const TAB_CHANNEL_NAME = "meshtastic:web:tab";
export const STEAL_AFTER_MS = 3000;

/**
 * - `pending`: the lock has not been asked for yet.
 * - `owner`: this tab holds the lock and runs the app.
 * - `other`: another tab runs the app.
 * - `claiming`: this tab asked the owner to let go and waits for the lock.
 */
export type TabLockStatus = "pending" | "owner" | "other" | "claiming";

export interface AppLockManager {
  request(
    name: string,
    options: LockOptions,
    callback: (lock: Lock | null) => Promise<unknown>,
  ): Promise<unknown>;
}

export interface TabChannel {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
  close(): void;
}

export interface TabLockEnvironment {
  /** Absent where `navigator.locks` is missing; the tab then owns the app. */
  locks: AppLockManager | undefined;
  openChannel: (name: string) => TabChannel;
  /** Disconnects every live session before the lock is given up. */
  onRelinquish: () => Promise<void>;
}

export interface TabLock {
  start(): void;
  takeOver(): void;
  getStatus(): TabLockStatus;
  subscribe(listener: () => void): () => void;
}

function isTakeover(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "takeover"
  );
}

/**
 * One tab at a time runs the app: the owner holds a Web Lock for its
 * lifetime and the browser frees it when the tab closes or crashes. Another
 * tab asks the owner to let go over a BroadcastChannel and, if the owner
 * does not release within `STEAL_AFTER_MS`, steals the lock.
 */
export function createTabLock(env: TabLockEnvironment): TabLock {
  const listeners = new Set<() => void>();
  let status: TabLockStatus = "pending";
  let started = false;
  let release: (() => void) | undefined;
  let relinquishing = false;
  let channel: TabChannel | undefined;

  const setStatus = (next: TabLockStatus) => {
    if (status === next) return;
    status = next;
    for (const listener of listeners) listener();
  };

  const teardown = async () => {
    relinquishing = true;
    try {
      await env.onRelinquish();
    } catch (error) {
      log.warn("relinquish: disconnect threw", {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      relinquishing = false;
    }
  };

  const onGranted = async (lock: Lock | null): Promise<void> => {
    if (!lock) {
      log.info("another tab owns the app");
      setStatus("other");
      return;
    }
    log.info("this tab owns the app");
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    setStatus("owner");
    return held;
  };

  const watch = (request: Promise<unknown>) => {
    request.then(
      () => {},
      (error) => {
        if (status !== "owner") return;
        log.warn("lock lost", {
          message: error instanceof Error ? error.message : String(error),
        });
        release = undefined;
        setStatus("other");
        if (!relinquishing) void teardown();
      },
    );
  };

  const relinquish = async () => {
    if (relinquishing) return;
    const held = release;
    log.info("another tab asked for the app");
    await teardown();
    if (release !== held || status !== "owner") return;
    release = undefined;
    setStatus("other");
    held?.();
  };

  return {
    start() {
      if (started) return;
      started = true;
      const { locks } = env;
      if (!locks) {
        log.info("navigator.locks missing, this tab owns the app");
        setStatus("owner");
        return;
      }
      const opened = env.openChannel(TAB_CHANNEL_NAME);
      opened.onmessage = (event) => {
        if (isTakeover(event.data) && status === "owner") void relinquish();
      };
      channel = opened;
      watch(locks.request(APP_LOCK_NAME, { ifAvailable: true }, onGranted));
    },
    takeOver() {
      const { locks } = env;
      if (!locks || status === "owner" || status === "claiming") return;
      setStatus("claiming");
      channel?.postMessage({ type: "takeover" });
      const waiting = new AbortController();
      const stealTimer = setTimeout(() => {
        log.warn("owner did not release, stealing the lock");
        waiting.abort();
        watch(locks.request(APP_LOCK_NAME, { steal: true }, onGranted));
      }, STEAL_AFTER_MS);
      watch(
        locks.request(APP_LOCK_NAME, { signal: waiting.signal }, (lock) => {
          clearTimeout(stealTimer);
          return onGranted(lock);
        }),
      );
    },
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createBrowserTabLock(
  onRelinquish: () => Promise<void>,
): TabLock {
  return createTabLock({
    locks:
      typeof navigator !== "undefined" && "locks" in navigator
        ? navigator.locks
        : undefined,
    openChannel: (name) => new BroadcastChannel(name),
    onRelinquish,
  });
}
