import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { TraceRoute } from "./domain/TraceRoute.ts";
import { runTraceRoute } from "./application/TraceRouteUseCase.ts";
import { TraceRouteStore } from "./state/tracerouteStore.ts";

export class TraceRouteClient {
  private readonly client: MeshClient;
  private readonly store: TraceRouteStore;
  public readonly list: ReadonlySignal<ReadonlyArray<TraceRoute>>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = new TraceRouteStore();
    this.list = this.store.read;

    client.events.onTraceRoutePacket.subscribe((packet) => {
      this.store.set(packet.from, {
        destination: packet.from,
        route: packet.data.route,
        snr: packet.data.snrTowards,
        time: packet.rxTime,
      });
    });
  }

  public latest(destination: number): TraceRoute | undefined {
    return this.store.get(destination);
  }

  public run(destination: number): Promise<ResultType<number, Error>> {
    return runTraceRoute(this.client, destination);
  }
}
