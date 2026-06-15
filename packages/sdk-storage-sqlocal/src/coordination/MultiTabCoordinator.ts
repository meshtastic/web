/**
 * Coordination across browser tabs of the same origin.
 *
 * - **Web Locks API** (`navigator.locks`): a single tab holds the writer lock
 *   for a given resource; others queue. Used to serialize destructive
 *   operations (full DB rebuilds, bulk imports) when needed.
 * - **BroadcastChannel**: lock-free pub/sub for "data changed" notifications,
 *   so reader tabs can refresh their views without polling.
 *
 * sqlocal handles low-level DB write serialization via OPFS file locks; this
 * layer is for app-level changes ("messages-changed for device 5, channel 0")
 * so the chat slice in another tab can re-query after a write.
 */

export type ChangeKind = "messages-changed" | "nodes-changed" | "telemetry-changed";

export interface ChangeEvent {
  kind: ChangeKind;
  deviceId: number;
  /** Free-form key (e.g. conversationKey for chat). */
  key?: string;
}

const CHANNEL_NAME = "meshtastic-storage";

export class MultiTabCoordinator {
  private readonly channel: BroadcastChannel | undefined;
  private readonly listeners = new Set<(event: ChangeEvent) => void>();

  constructor() {
    if (typeof BroadcastChannel === "undefined") {
      this.channel = undefined;
      return;
    }
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (msg) => {
      const event = msg.data as ChangeEvent;
      for (const listener of this.listeners) listener(event);
    };
  }

  broadcast(event: ChangeEvent): void {
    this.channel?.postMessage(event);
  }

  subscribe(listener: (event: ChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Acquires an app-level Web Lock for the given resource. Resolves with a
   * release function once the lock is granted. Falls through (no lock held)
   * when the Web Locks API is not available.
   */
  async acquireLock<T>(
    resource: string,
    handler: () => Promise<T>,
    options?: { mode?: "exclusive" | "shared"; ifAvailable?: boolean },
  ): Promise<T> {
    if (typeof navigator === "undefined" || !navigator.locks) {
      return handler();
    }
    const result = await navigator.locks.request(resource, options ?? {}, async (lock) => {
      if (lock === null) return undefined;
      return handler();
    });
    return result as T;
  }

  close(): void {
    this.channel?.close();
    this.listeners.clear();
  }
}
