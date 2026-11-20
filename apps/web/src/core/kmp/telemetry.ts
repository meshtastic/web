import type { Protobuf, Types } from "@core/protobuf.ts";
import type {
  TelemetryReading,
  TelemetryRepository,
  TelemetryRetentionPolicy,
} from "@core/storage/types.ts";
import { type Signal, signal } from "@preact/signals-core";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

const MAX_HISTORY = 256;
const HYDRATE_LIMIT = 256;

export interface TelemetryClientOptions {
  repository?: TelemetryRepository;
  retention?: TelemetryRetentionPolicy;
}

/** Telemetry readings per node, live and from storage. */
export class TelemetryClient {
  private readonly latestStore = new Map<
    number,
    Signal<TelemetryReading | undefined>
  >();
  private readonly latestRead = new Map<
    number,
    ReadonlySignal<TelemetryReading | undefined>
  >();
  private readonly historyStore = new Map<number, Signal<TelemetryReading[]>>();
  private readonly historyRead = new Map<
    number,
    ReadonlySignal<TelemetryReading[]>
  >();
  private readonly hydrated = new Set<number>();
  private readonly repository: TelemetryRepository | undefined;
  private readonly retention: TelemetryRetentionPolicy | undefined;
  private epoch = 0;

  constructor(options: TelemetryClientOptions = {}) {
    this.repository = options.repository;
    this.retention = options.retention;
  }

  receive(packet: Types.PacketMetadata<Protobuf.Telemetry.Telemetry>): void {
    const reading: TelemetryReading = {
      nodeNum: packet.from,
      time: packet.rxTime,
      kind: packet.data.variant.case,
      value: packet.data.variant.value,
    };
    this.ensureLatest(reading.nodeNum).value = reading;
    const history = this.ensureHistory(reading.nodeNum);
    const next = [...history.value, reading];
    if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
    history.value = next;
    void this.persist(reading);
  }

  latest(nodeNum: number): ReadonlySignal<TelemetryReading | undefined> {
    void this.hydrate(nodeNum);
    const sig = this.ensureLatest(nodeNum);
    return this.latestRead.get(nodeNum) ?? toReadonly(sig);
  }

  history(nodeNum: number): ReadonlySignal<TelemetryReading[]> {
    void this.hydrate(nodeNum);
    const sig = this.ensureHistory(nodeNum);
    return this.historyRead.get(nodeNum) ?? toReadonly(sig);
  }

  rescope(scope: number): void {
    this.repository?.setScope?.(scope);
    this.epoch++;
    const nodes = [...this.hydrated];
    this.hydrated.clear();
    for (const sig of this.latestStore.values()) sig.value = undefined;
    for (const sig of this.historyStore.values()) {
      if (sig.value.length > 0) sig.value = [];
    }
    for (const nodeNum of nodes) void this.hydrate(nodeNum);
  }

  async clearNode(nodeNum: number): Promise<void> {
    this.hydrated.delete(nodeNum);
    await this.repository?.clearNode(nodeNum);
  }

  async clear(): Promise<void> {
    this.hydrated.clear();
    await this.repository?.clear();
  }

  private async persist(reading: TelemetryReading): Promise<void> {
    if (!this.repository) return;
    try {
      await this.repository.append(reading);
      if (this.retention) await this.repository.prune(this.retention);
    } catch (e) {
      console.warn("[telemetry] persistence failed:", e);
    }
  }

  private async hydrate(nodeNum: number): Promise<void> {
    if (this.hydrated.has(nodeNum) || !this.repository) return;
    this.hydrated.add(nodeNum);
    const epoch = this.epoch;
    try {
      const readings = await this.repository.loadRecent(nodeNum, HYDRATE_LIMIT);
      if (epoch !== this.epoch || readings.length === 0) return;
      const history = this.ensureHistory(nodeNum);
      const keyOf = (r: TelemetryReading): string =>
        `${r.kind}:${r.time.getTime()}`;
      const seen = new Set(history.value.map(keyOf));
      const added = readings.filter((r) => {
        const key = keyOf(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (added.length === 0) return;
      const next = [...history.value, ...added].sort(
        (a, b) => a.time.getTime() - b.time.getTime(),
      );
      if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
      history.value = next;
      this.ensureLatest(nodeNum).value = next[next.length - 1];
    } catch (e) {
      console.warn("[telemetry] hydrate failed:", e);
    }
  }

  private ensureLatest(nodeNum: number): Signal<TelemetryReading | undefined> {
    let sig = this.latestStore.get(nodeNum);
    if (!sig) {
      sig = signal<TelemetryReading | undefined>(undefined);
      this.latestStore.set(nodeNum, sig);
      this.latestRead.set(nodeNum, toReadonly(sig));
    }
    return sig;
  }

  private ensureHistory(nodeNum: number): Signal<TelemetryReading[]> {
    let sig = this.historyStore.get(nodeNum);
    if (!sig) {
      sig = signal<TelemetryReading[]>([]);
      this.historyStore.set(nodeNum, sig);
      this.historyRead.set(nodeNum, toReadonly(sig));
    }
    return sig;
  }
}
