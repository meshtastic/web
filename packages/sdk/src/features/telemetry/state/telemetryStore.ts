import { type Signal, signal } from "@preact/signals-core";
import {
  type ReadonlySignal,
  toReadonly,
} from "../../../core/signals/createStore.ts";
import type { TelemetryReading } from "../domain/TelemetryReading.ts";

const MAX_HISTORY = 256;

export class TelemetryStore {
  private readonly latest = new Map<
    number,
    Signal<TelemetryReading | undefined>
  >();
  private readonly latestRead = new Map<
    number,
    ReadonlySignal<TelemetryReading | undefined>
  >();
  private readonly history = new Map<number, Signal<TelemetryReading[]>>();
  private readonly historyRead = new Map<
    number,
    ReadonlySignal<TelemetryReading[]>
  >();

  append(reading: TelemetryReading): void {
    const latestSig = this.ensureLatest(reading.nodeNum);
    latestSig.value = reading;

    const histSig = this.ensureHistory(reading.nodeNum);
    const next = [...histSig.value, reading];
    if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
    histSig.value = next;
  }

  /**
   * Adds stored readings for one node, skipping any already held (same kind
   * and time), and keeps history in time order with the newest as latest.
   */
  merge(nodeNum: number, readings: ReadonlyArray<TelemetryReading>): void {
    if (readings.length === 0) return;
    const histSig = this.ensureHistory(nodeNum);
    const keyOf = (r: TelemetryReading): string =>
      `${r.kind}:${r.time.getTime()}`;
    const seen = new Set(histSig.value.map(keyOf));
    const added = readings.filter((r) => {
      const key = keyOf(r);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (added.length === 0) return;
    const next = [...histSig.value, ...added].sort(
      (a, b) => a.time.getTime() - b.time.getTime(),
    );
    if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
    histSig.value = next;
    this.ensureLatest(nodeNum).value = next[next.length - 1];
  }

  /**
   * Empties every node's latest reading and history. Signals stay in place
   * so subscribers keep receiving updates.
   */
  clear(): void {
    for (const sig of this.latest.values()) sig.value = undefined;
    for (const sig of this.history.values()) {
      if (sig.value.length > 0) sig.value = [];
    }
  }

  latestFor(nodeNum: number): ReadonlySignal<TelemetryReading | undefined> {
    this.ensureLatest(nodeNum);
    const read = this.latestRead.get(nodeNum);
    if (!read) throw new Error("unreachable");
    return read;
  }

  historyFor(nodeNum: number): ReadonlySignal<TelemetryReading[]> {
    this.ensureHistory(nodeNum);
    const read = this.historyRead.get(nodeNum);
    if (!read) throw new Error("unreachable");
    return read;
  }

  private ensureLatest(nodeNum: number): Signal<TelemetryReading | undefined> {
    let sig = this.latest.get(nodeNum);
    if (!sig) {
      sig = signal<TelemetryReading | undefined>(undefined);
      this.latest.set(nodeNum, sig);
      this.latestRead.set(nodeNum, toReadonly(sig));
    }
    return sig;
  }

  private ensureHistory(nodeNum: number): Signal<TelemetryReading[]> {
    let sig = this.history.get(nodeNum);
    if (!sig) {
      sig = signal<TelemetryReading[]>([]);
      this.history.set(nodeNum, sig);
      this.historyRead.set(nodeNum, toReadonly(sig));
    }
    return sig;
  }
}
