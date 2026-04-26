import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { Node } from "./domain/Node.ts";
import type { NodesRepository } from "./domain/NodesRepository.ts";
import { NodeMapper } from "./infrastructure/NodeMapper.ts";
import { InMemoryNodesRepository } from "./infrastructure/repositories/InMemoryNodesRepository.ts";
import { NodesStore } from "./state/nodesStore.ts";
import { favoriteNode, removeFavoriteNode } from "./application/FavoriteNodeUseCase.ts";
import { ignoreNode, removeIgnoredNode } from "./application/IgnoreNodeUseCase.ts";
import { removeNodeByNum, resetNodes } from "./application/RemoveNodeUseCase.ts";

export interface NodesClientOptions {
  repository?: NodesRepository;
}

export class NodesClient {
  private readonly client: MeshClient;
  private readonly store: NodesStore;
  private readonly repository: NodesRepository;
  private hydrated = false;

  public readonly list: ReadonlySignal<ReadonlyArray<Node>>;

  constructor(client: MeshClient, options: NodesClientOptions = {}) {
    this.client = client;
    this.store = new NodesStore();
    this.repository = options.repository ?? new InMemoryNodesRepository();
    this.list = this.store.read;

    client.events.onNodeInfoPacket.subscribe((info) => {
      const node = NodeMapper.fromProto(info);
      this.store.set(node.num, node);
      void this.repository.upsert(node).catch(() => {});
    });

    void this.hydrate();
  }

  /**
   * One-shot load from the repository on construction. Subsequent live
   * NodeInfo packets continue to write through to the repository as they
   * arrive.
   */
  private async hydrate(): Promise<void> {
    if (this.hydrated) return;
    this.hydrated = true;
    try {
      const persisted = await this.repository.loadAll();
      for (const node of persisted) {
        if (!this.store.has(node.num)) this.store.set(node.num, node);
      }
    } catch {
      // ok — adapter may not have history yet
    }
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
    void this.repository.remove(nodeNum).catch(() => {});
    this.store.delete(nodeNum);
    return removeNodeByNum(this.client, nodeNum);
  }

  public reset(): Promise<ResultType<number, Error>> {
    void this.repository.clear().catch(() => {});
    this.store.clear();
    return resetNodes(this.client);
  }
}
