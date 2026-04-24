import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { Node } from "./domain/Node.ts";
import { NodeMapper } from "./infrastructure/NodeMapper.ts";
import { NodesStore } from "./state/nodesStore.ts";
import { favoriteNode, removeFavoriteNode } from "./application/FavoriteNodeUseCase.ts";
import { ignoreNode, removeIgnoredNode } from "./application/IgnoreNodeUseCase.ts";
import { removeNodeByNum, resetNodes } from "./application/RemoveNodeUseCase.ts";

export class NodesClient {
  private readonly client: MeshClient;
  private readonly store: NodesStore;
  public readonly list: ReadonlySignal<ReadonlyArray<Node>>;

  constructor(client: MeshClient) {
    this.client = client;
    this.store = new NodesStore();
    this.list = this.store.read;

    client.events.onNodeInfoPacket.subscribe((info) => {
      this.store.set(info.num, NodeMapper.fromProto(info));
    });
  }

  public byNum(nodeNum: number): Node | undefined {
    return this.store.get(nodeNum);
  }

  public favorite(nodeNum: number): Promise<ResultType<number, Error>> {
    return favoriteNode(this.client, nodeNum);
  }

  public unfavorite(nodeNum: number): Promise<ResultType<number, Error>> {
    return removeFavoriteNode(this.client, nodeNum);
  }

  public ignore(nodeNum: number): Promise<ResultType<number, Error>> {
    return ignoreNode(this.client, nodeNum);
  }

  public unignore(nodeNum: number): Promise<ResultType<number, Error>> {
    return removeIgnoredNode(this.client, nodeNum);
  }

  public remove(nodeNum: number): Promise<ResultType<number, Error>> {
    return removeNodeByNum(this.client, nodeNum);
  }

  public reset(): Promise<ResultType<number, Error>> {
    return resetNodes(this.client);
  }
}
