import type * as Protobuf from "@meshtastic/protobufs";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { Position } from "./domain/Position.ts";
import { PositionMapper } from "./infrastructure/PositionMapper.ts";
import {
  removeFixedPosition,
  requestPosition,
  setFixedPosition,
  setPosition,
} from "./application/PositionUseCases.ts";
import { PositionStore } from "./state/positionStore.ts";

export class PositionClient {
  private readonly client: MeshClient;
  private readonly store: PositionStore;
  public readonly list: ReadonlySignal<ReadonlyArray<Position>>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = new PositionStore();
    this.list = this.store.read;

    client.events.onPositionPacket.subscribe((packet) => {
      this.store.set(packet.from, PositionMapper.fromPacket(packet));
    });
  }

  public byNode(nodeNum: number): Position | undefined {
    return this.store.get(nodeNum);
  }

  public setFixed(latitude: number, longitude: number): Promise<ResultType<number, Error>> {
    return setFixedPosition(this.client, latitude, longitude);
  }

  public removeFixed(): Promise<ResultType<number, Error>> {
    return removeFixedPosition(this.client);
  }

  public set(position: Protobuf.Mesh.Position): Promise<ResultType<number, Error>> {
    return setPosition(this.client, position);
  }

  public request(destination: number): Promise<ResultType<number, Error>> {
    return requestPosition(this.client, destination);
  }
}
