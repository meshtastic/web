import type { AppLockManager, TabChannel } from "@core/tabLock.ts";

type Granted = (lock: Lock | null) => Promise<unknown>;

interface Pending {
  callback: Granted;
  options: LockOptions;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

interface Holder {
  steal: () => void;
}

const abortError = (message: string) => new DOMException(message, "AbortError");

export interface FakeLocks extends AppLockManager {
  isHeld(name: string): boolean;
  pendingCount(name: string): number;
}

export function createFakeLocks(): FakeLocks {
  const holders = new Map<string, Holder>();
  const queues = new Map<string, Pending[]>();

  const queueFor = (name: string): Pending[] => {
    let queue = queues.get(name);
    if (!queue) {
      queue = [];
      queues.set(name, queue);
    }
    return queue;
  };

  const grant = (name: string, pending: Pending): void => {
    let stolen: (reason: unknown) => void = () => {};
    const stolenPromise = new Promise<never>((_, reject) => {
      stolen = reject;
    });
    const holder: Holder = {
      steal: () =>
        stolen(abortError("The lock was stolen by another request.")),
    };
    holders.set(name, holder);
    const lock: Lock = { name, mode: "exclusive" };
    const finish = () => {
      if (holders.get(name) === holder) {
        holders.delete(name);
        grantNext(name);
      }
    };
    Promise.race([
      Promise.resolve().then(() => pending.callback(lock)),
      stolenPromise,
    ]).then(
      (value) => {
        finish();
        pending.resolve(value);
      },
      (reason) => {
        finish();
        pending.reject(reason);
      },
    );
  };

  const grantNext = (name: string): void => {
    const next = queueFor(name).shift();
    if (next) grant(name, next);
  };

  return {
    isHeld: (name) => holders.has(name),
    pendingCount: (name) => queueFor(name).length,
    request(name, options, callback) {
      return new Promise<unknown>((resolve, reject) => {
        const pending: Pending = { callback, options, resolve, reject };
        const held = holders.get(name);
        if (options.steal) {
          held?.steal();
          grant(name, pending);
          return;
        }
        if (!held) {
          grant(name, pending);
          return;
        }
        if (options.ifAvailable) {
          Promise.resolve()
            .then(() => callback(null))
            .then(resolve, reject);
          return;
        }
        if (options.signal?.aborted) {
          reject(abortError("The request was aborted."));
          return;
        }
        queueFor(name).push(pending);
        options.signal?.addEventListener("abort", () => {
          const queue = queueFor(name);
          const index = queue.indexOf(pending);
          if (index === -1) return;
          queue.splice(index, 1);
          reject(abortError("The request was aborted."));
        });
      });
    },
  };
}

export interface FakeChannelHub {
  open(name: string): TabChannel;
}

export function createFakeChannelHub(): FakeChannelHub {
  const channels = new Map<string, Set<TabChannel>>();
  return {
    open(name) {
      let peers = channels.get(name);
      if (!peers) {
        peers = new Set();
        channels.set(name, peers);
      }
      const members = peers;
      const channel: TabChannel = {
        onmessage: null,
        postMessage(message) {
          for (const peer of members) {
            if (peer === channel) continue;
            queueMicrotask(() => {
              peer.onmessage?.(new MessageEvent("message", { data: message }));
            });
          }
        },
        close() {
          members.delete(channel);
        },
      };
      members.add(channel);
      return channel;
    },
  };
}
