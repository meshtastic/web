import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { TelemetryReading } from "./domain/TelemetryReading.ts";
import type {
  TelemetryRepository,
  TelemetryRetentionPolicy,
} from "./domain/TelemetryRepository.ts";
import { InMemoryTelemetryRepository } from "./infrastructure/repositories/InMemoryTelemetryRepository.ts";
import { TelemetryMapper } from "./infrastructure/TelemetryMapper.ts";
import { TelemetryStore } from "./state/telemetryStore.ts";

export interface TelemetryClientOptions {
  repository?: TelemetryRepository;
  retention?: TelemetryRetentionPolicy;
}

const HYDRATE_LIMIT = 256;

export class TelemetryClient {
  private readonly store: TelemetryStore;
  private readonly repository: TelemetryRepository;
  private readonly retention?: TelemetryRetentionPolicy;
  private readonly hydrated = new Set<number>();

  constructor(client: MeshClient, options: TelemetryClientOptions = {}) {
    this.store = new TelemetryStore();
    this.repository = options.repository ?? new InMemoryTelemetryRepository();
    this.retention = options.retention;

    client.events.onTelemetryPacket.subscribe(async (packet) => {
      const reading = TelemetryMapper.fromPacket(packet);
      this.store.append(reading);
      try {
        await this.repository.append(reading);
        if (this.retention) {
          await this.repository.prune(this.retention);
        }
      } catch (e) {
        console.warn("[TelemetryClient] persistence failed:", e);
      }
    });
  }

  public latest(nodeNum: number): ReadonlySignal<TelemetryReading | undefined> {
    void this.hydrate(nodeNum);
    return this.store.latestFor(nodeNum);
  }

  public history(nodeNum: number): ReadonlySignal<TelemetryReading[]> {
    void this.hydrate(nodeNum);
    return this.store.historyFor(nodeNum);
  }

  /**
   * Page older readings before the given cursor — passes through to the
   * repository. Caller is responsible for merging with the in-memory store
   * if it wants the result reflected in the `history(nodeNum)` signal.
   */
  public loadBefore(nodeNum: number, cursor: Date, limit: number): Promise<TelemetryReading[]> {
    return this.repository.loadBefore(nodeNum, cursor, limit);
  }

  public clearNode(nodeNum: number): Promise<void> {
    this.hydrated.delete(nodeNum);
    return this.repository.clearNode(nodeNum);
  }

  public clear(): Promise<void> {
    this.hydrated.clear();
    return this.repository.clear();
  }

  private async hydrate(nodeNum: number): Promise<void> {
    if (this.hydrated.has(nodeNum)) return;
    this.hydrated.add(nodeNum);
    try {
      const readings = await this.repository.loadRecent(nodeNum, HYDRATE_LIMIT);
      for (const reading of readings) {
        this.store.append(reading);
      }
    } catch (e) {
      console.warn("[TelemetryClient] hydrate failed:", e);
    }
  }
}
