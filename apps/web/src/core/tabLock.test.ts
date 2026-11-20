import {
  createFakeChannelHub,
  createFakeLocks,
} from "@app/tests/fakeTabEnvironment.ts";
import {
  APP_LOCK_NAME,
  type AppLockManager,
  createTabLock,
  STEAL_AFTER_MS,
  TAB_CHANNEL_NAME,
} from "@core/tabLock.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};

function setup() {
  const locks = createFakeLocks();
  const hub = createFakeChannelHub();
  const tab = (relinquish: () => Promise<void> = async () => {}) => {
    const onRelinquish = vi.fn(relinquish);
    const lock = createTabLock({
      locks,
      openChannel: (name) => hub.open(name),
      onRelinquish,
    });
    return { lock, onRelinquish };
  };
  return { locks, tab };
}

describe("tabLock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("makes the first tab the owner", async () => {
    const { locks, tab } = setup();
    const a = tab();
    expect(a.lock.getStatus()).toBe("pending");
    a.lock.start();
    await flush();
    expect(a.lock.getStatus()).toBe("owner");
    expect(locks.isHeld(APP_LOCK_NAME)).toBe(true);
  });

  it("leaves a second tab waiting and quiet", async () => {
    const { tab } = setup();
    const a = tab();
    const b = tab();
    a.lock.start();
    await flush();
    b.lock.start();
    await flush();
    expect(b.lock.getStatus()).toBe("other");
    expect(a.lock.getStatus()).toBe("owner");
    expect(a.onRelinquish).not.toHaveBeenCalled();
    expect(b.onRelinquish).not.toHaveBeenCalled();
  });

  it("hands the app over when the second tab takes over", async () => {
    const { locks, tab } = setup();
    const a = tab();
    const b = tab();
    a.lock.start();
    await flush();
    b.lock.start();
    await flush();

    b.lock.takeOver();
    expect(b.lock.getStatus()).toBe("claiming");
    await flush();

    expect(a.onRelinquish).toHaveBeenCalledTimes(1);
    expect(a.lock.getStatus()).toBe("other");
    expect(b.lock.getStatus()).toBe("owner");
    expect(locks.isHeld(APP_LOCK_NAME)).toBe(true);
    expect(b.onRelinquish).not.toHaveBeenCalled();
  });

  it("lets the old owner take the app back", async () => {
    const { tab } = setup();
    const a = tab();
    const b = tab();
    a.lock.start();
    await flush();
    b.lock.start();
    await flush();
    b.lock.takeOver();
    await flush();

    a.lock.takeOver();
    await flush();

    expect(b.onRelinquish).toHaveBeenCalledTimes(1);
    expect(a.lock.getStatus()).toBe("owner");
    expect(b.lock.getStatus()).toBe("other");
  });

  it("takes the lock once the owner finishes releasing, without stealing", async () => {
    const { tab } = setup();
    let finish: () => void = () => {};
    const a = tab(() => new Promise<void>((resolve) => (finish = resolve)));
    const b = tab();
    a.lock.start();
    await flush();
    b.lock.start();
    await flush();

    b.lock.takeOver();
    await vi.advanceTimersByTimeAsync(STEAL_AFTER_MS - 1);
    expect(b.lock.getStatus()).toBe("claiming");
    expect(a.lock.getStatus()).toBe("owner");

    finish();
    await flush();
    expect(b.lock.getStatus()).toBe("owner");
    expect(a.lock.getStatus()).toBe("other");
    await vi.advanceTimersByTimeAsync(STEAL_AFTER_MS);
    expect(a.onRelinquish).toHaveBeenCalledTimes(1);
  });

  it("steals the lock from an owner that does not answer", async () => {
    const { tab } = setup();
    const a = tab(() => new Promise<void>(() => {}));
    const b = tab();
    a.lock.start();
    await flush();
    b.lock.start();
    await flush();

    b.lock.takeOver();
    await vi.advanceTimersByTimeAsync(STEAL_AFTER_MS - 1);
    expect(b.lock.getStatus()).toBe("claiming");

    await vi.advanceTimersByTimeAsync(1);
    expect(b.lock.getStatus()).toBe("owner");
    expect(a.lock.getStatus()).toBe("other");
    expect(a.onRelinquish).toHaveBeenCalledTimes(1);
  });

  it("tears down an owner whose lock was stolen", async () => {
    const { locks, tab } = setup();
    const a = tab();
    a.lock.start();
    await flush();

    void locks
      .request(APP_LOCK_NAME, { steal: true }, () => new Promise(() => {}))
      .catch(() => {});
    await flush();

    expect(a.onRelinquish).toHaveBeenCalledTimes(1);
    expect(a.lock.getStatus()).toBe("other");
  });

  it("does not tear itself down when a late grant and the steal both arrive", async () => {
    const hub = createFakeChannelHub();
    const requests: Array<{
      options: LockOptions;
      callback: (lock: Lock | null) => Promise<unknown>;
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
    }> = [];
    const locks: AppLockManager = {
      request: (_name, options, callback) =>
        new Promise((resolve, reject) => {
          requests.push({ options, callback, resolve, reject });
        }),
    };
    const onRelinquish = vi.fn(async () => {});
    const lock = createTabLock({
      locks,
      openChannel: (name) => hub.open(name),
      onRelinquish,
    });
    lock.start();
    const [initial] = requests;
    if (!initial) throw new Error("no initial request");
    void initial.callback(null);
    await flush();
    expect(lock.getStatus()).toBe("other");

    lock.takeOver();
    const normal = requests[1];
    if (!normal) throw new Error("no takeover request");
    vi.advanceTimersByTime(STEAL_AFTER_MS);
    const steal = requests[2];
    if (!steal) throw new Error("no steal request");
    const late = normal.callback({ name: APP_LOCK_NAME, mode: "exclusive" });
    void steal.callback({ name: APP_LOCK_NAME, mode: "exclusive" });
    await flush();
    expect(lock.getStatus()).toBe("owner");

    normal.reject(new DOMException("stolen", "AbortError"));
    await late;
    await flush();

    expect(lock.getStatus()).toBe("owner");
    expect(onRelinquish).not.toHaveBeenCalled();
  });

  it("ignores takeover requests while not the owner", async () => {
    const { tab } = setup();
    const a = tab();
    const b = tab();
    const c = tab();
    a.lock.start();
    await flush();
    b.lock.start();
    c.lock.start();
    await flush();

    b.lock.takeOver();
    await flush();

    expect(c.onRelinquish).not.toHaveBeenCalled();
    expect(c.lock.getStatus()).toBe("other");
  });

  it("is the owner when navigator.locks is missing", async () => {
    const hub = createFakeChannelHub();
    const openChannel = vi.fn((name: string) => hub.open(name));
    const lock = createTabLock({
      locks: undefined,
      openChannel,
      onRelinquish: async () => {},
    });
    lock.start();
    expect(lock.getStatus()).toBe("owner");
    expect(openChannel).not.toHaveBeenCalled();
  });

  it("listens on the shared tab channel and notifies subscribers", async () => {
    const hub = createFakeChannelHub();
    const open = vi.spyOn(hub, "open");
    const lock = createTabLock({
      locks: createFakeLocks(),
      openChannel: (name) => hub.open(name),
      onRelinquish: async () => {},
    });
    const seen: string[] = [];
    lock.subscribe(() => seen.push(lock.getStatus()));
    lock.start();
    await flush();
    expect(open).toHaveBeenCalledWith(TAB_CHANNEL_NAME);
    expect(seen).toEqual(["owner"]);
  });
});
