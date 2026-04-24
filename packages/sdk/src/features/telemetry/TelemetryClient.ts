import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { TelemetryReading } from "./domain/TelemetryReading.ts";
import { TelemetryMapper } from "./infrastructure/TelemetryMapper.ts";
import { TelemetryStore } from "./state/telemetryStore.ts";

export class TelemetryClient {
  private readonly store: TelemetryStore;

  constructor(client: MeshClient) {
    this.store = new TelemetryStore();
    client.events.onTelemetryPacket.subscribe((packet) => {
      this.store.append(TelemetryMapper.fromPacket(packet));
    });
  }

  public latest(nodeNum: number): ReadonlySignal<TelemetryReading | undefined> {
    return this.store.latestFor(nodeNum);
  }

  public history(nodeNum: number): ReadonlySignal<TelemetryReading[]> {
    return this.store.historyFor(nodeNum);
  }
}
