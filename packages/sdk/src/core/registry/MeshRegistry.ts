import { type Signal, signal } from "@preact/signals-core";
import { MeshClient, type MeshClientOptions } from "../client/MeshClient.ts";
import { type ReadonlySignal, toReadonly } from "../signals/createStore.ts";

export type ConnectionId = number;

export interface RegistryEntry {
  readonly id: ConnectionId;
  readonly client: MeshClient;
}

/**
 * Manages multiple `MeshClient` instances keyed by connection id.
 *
 * Use this when an application holds more than one device connection at a
 * time (e.g. multi-radio UIs). Single-device consumers can ignore this and
 * instantiate `MeshClient` directly.
 */
export class MeshRegistry {
  private readonly clients = new Map<ConnectionId, MeshClient>();
  private readonly backing: Signal<ReadonlyArray<RegistryEntry>>;
  private readonly activeSignal: Signal<MeshClient | undefined>;
  private readonly activeIdSignal: Signal<ConnectionId | null>;

  public readonly list: ReadonlySignal<ReadonlyArray<RegistryEntry>>;
  public readonly active: ReadonlySignal<MeshClient | undefined>;
  public readonly activeId: ReadonlySignal<ConnectionId | null>;

  constructor() {
    this.backing = signal<ReadonlyArray<RegistryEntry>>([]);
    this.activeSignal = signal<MeshClient | undefined>(undefined);
    this.activeIdSignal = signal<ConnectionId | null>(null);
    this.list = toReadonly(this.backing);
    this.active = toReadonly(this.activeSignal);
    this.activeId = toReadonly(this.activeIdSignal);
  }

  public create(id: ConnectionId, options: MeshClientOptions): MeshClient {
    if (this.clients.has(id)) {
      throw new Error(`MeshRegistry already has a client for id ${id}`);
    }
    const client = new MeshClient(options);
    return this.adopt(id, client);
  }

  /**
   * Registers an externally-constructed MeshClient under the given id. Useful
   * when the client was produced by a legacy shim (e.g. the Phase-A MeshDevice
   * wrapper) and must coexist with the registry during migration.
   */
  public register(id: ConnectionId, client: MeshClient): MeshClient {
    if (this.clients.has(id)) {
      throw new Error(`MeshRegistry already has a client for id ${id}`);
    }
    return this.adopt(id, client);
  }

  private adopt(id: ConnectionId, client: MeshClient): MeshClient {
    this.clients.set(id, client);
    this.snapshot();
    if (this.activeIdSignal.value === null) {
      this.setActive(id);
    }
    return client;
  }

  public get(id: ConnectionId): MeshClient | undefined {
    return this.clients.get(id);
  }

  public has(id: ConnectionId): boolean {
    return this.clients.has(id);
  }

  public setActive(id: ConnectionId | null): void {
    if (id === null) {
      this.activeIdSignal.value = null;
      this.activeSignal.value = undefined;
      return;
    }
    const client = this.clients.get(id);
    if (!client) {
      throw new Error(`MeshRegistry has no client for id ${id}`);
    }
    this.activeIdSignal.value = id;
    this.activeSignal.value = client;
  }

  public async remove(id: ConnectionId): Promise<void> {
    const client = this.clients.get(id);
    if (!client) return;
    await client.disconnect().catch(() => {});
    this.unregister(id);
  }

  /**
   * Removes the mapping without disconnecting the client. Use when the caller
   * has already torn down the transport itself (e.g. the legacy useConnections
   * flow in packages/web).
   */
  public unregister(id: ConnectionId): void {
    if (!this.clients.has(id)) return;
    this.clients.delete(id);
    if (this.activeIdSignal.value === id) {
      const next = this.clients.keys().next();
      this.setActive(next.done ? null : (next.value as ConnectionId));
    }
    this.snapshot();
  }

  public get size(): number {
    return this.clients.size;
  }

  private snapshot(): void {
    this.backing.value = Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      client,
    }));
  }
}
