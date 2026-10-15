import type { EventBus } from "../../../core/event-bus/EventBus.ts";

/**
 * Firmware rotates the admin session passkey every 150 s and accepts one for
 * 300 s. Using it for at most 4 minutes keeps a safety margin.
 */
export const SESSION_PASSKEY_TTL_MS = 4 * 60_000;

/** How long to wait for a node to answer the request that seeds its passkey. */
export const SESSION_SEED_TIMEOUT_MS = 30_000;

interface Entry {
  key: Uint8Array;
  receivedAt: number;
}

/**
 * Per-node cache of admin session passkeys. Firmware attaches a passkey to
 * every admin response; a client must send it back on admin writes to that
 * node, or remote nodes reject them with ADMIN_BAD_SESSION_KEY.
 *
 * Only responses are trusted: the passkey is latched from admin messages that
 * a node sent us, never from our own requests.
 */
export class AdminSession {
  private readonly keys = new Map<number, Entry>();
  private readonly waiters = new Map<number, (() => void)[]>();

  constructor(
    events: EventBus,
    private readonly now: () => number = Date.now,
  ) {
    events.onAdminPacket.subscribe((packet) => {
      const key = packet.data.sessionPasskey;
      if (key.length === 0) return;
      this.keys.set(packet.from, { key, receivedAt: this.now() });
      const waiting = this.waiters.get(packet.from);
      this.waiters.delete(packet.from);
      for (const resolve of waiting ?? []) resolve();
    });
  }

  /** The node's passkey, if one arrived within the TTL. */
  public get(nodeNum: number): Uint8Array | undefined {
    const entry = this.keys.get(nodeNum);
    if (!entry) return undefined;
    if (this.now() - entry.receivedAt > SESSION_PASSKEY_TTL_MS) {
      this.keys.delete(nodeNum);
      return undefined;
    }
    return entry.key;
  }

  public forget(nodeNum: number): void {
    this.keys.delete(nodeNum);
  }

  public clear(): void {
    this.keys.clear();
  }

  /** Resolves true once a passkey from the node arrives, false on timeout. */
  public waitFor(
    nodeNum: number,
    timeoutMs = SESSION_SEED_TIMEOUT_MS,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const list = this.waiters.get(nodeNum) ?? [];
        this.waiters.set(
          nodeNum,
          list.filter((w) => w !== onKey),
        );
        resolve(false);
      }, timeoutMs);
      const onKey = () => {
        clearTimeout(timer);
        resolve(true);
      };
      this.waiters.set(nodeNum, [...(this.waiters.get(nodeNum) ?? []), onKey]);
    });
  }
}
