import { type Signal, signal } from "@preact/signals-core";
import { type ReadonlySignal, toReadonly } from "../../../core/signals/createStore.ts";
import type { TelemetryReading } from "../domain/TelemetryReading.ts";

const MAX_HISTORY = 256;

export class TelemetryStore {
  private readonly latest = new Map<number, Signal<TelemetryReading | undefined>>();
  private readonly latestRead = new Map<number, ReadonlySignal<TelemetryReading | undefined>>();
  private readonly history = new Map<number, Signal<TelemetryReading[]>>();
  private readonly historyRead = new Map<number, ReadonlySignal<TelemetryReading[]>>();

  append(reading: TelemetryReading): void {
    const latestSig = this.ensureLatest(reading.nodeNum);
    latestSig.value = reading;

    const histSig = this.ensureHistory(reading.nodeNum);
    const next = [...histSig.value, reading];
    if (next.length > MAX_HISTORY) next.splice(0, next.length - MAX_HISTORY);
    histSig.value = next;
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
