import * as Protobuf from "@meshtastic/protobufs";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { Node } from "./domain/Node.ts";
import type { NodeError, NodeErrorType } from "./domain/NodeError.ts";
import type { NodesRepository } from "./domain/NodesRepository.ts";
import { NodeMapper } from "./infrastructure/NodeMapper.ts";
import { InMemoryNodesRepository } from "./infrastructure/repositories/InMemoryNodesRepository.ts";
import { validateIncomingNode } from "./infrastructure/nodeValidation.ts";
import { NodeErrorsStore } from "./state/nodeErrorsStore.ts";
import { NodesStore } from "./state/nodesStore.ts";
import { favoriteNode, removeFavoriteNode } from "./application/FavoriteNodeUseCase.ts";
import { ignoreNode, removeIgnoredNode } from "./application/IgnoreNodeUseCase.ts";
import { removeNodeByNum, resetNodes } from "./application/RemoveNodeUseCase.ts";

export interface NodesClientOptions {
  repository?: NodesRepository;
}

/**
 * Per-client view of the device's node DB plus client-side validation /
 * error tracking. Persists snapshots through the configured
 * `NodesRepository`; rehydrates on construction.
 */
export class NodesClient {
  private readonly client: MeshClient;
  private readonly store: NodesStore;
  private readonly errorsStore: NodeErrorsStore;
  private readonly repository: NodesRepository;
  private hydrated = false;

  public readonly list: ReadonlySignal<ReadonlyArray<Node>>;
  public readonly errors: ReadonlySignal<ReadonlyArray<NodeError>>;

  constructor(client: MeshClient, options: NodesClientOptions = {}) {
    this.client = client;
    this.store = new NodesStore();
    this.errorsStore = new NodeErrorsStore();
    this.repository = options.repository ?? new InMemoryNodesRepository();
    this.list = this.store.read;
    this.errors = this.errorsStore.read;

    client.events.onNodeInfoPacket.subscribe((info) => {
      this.handleIncoming(info);
    });

    client.events.onRoutingPacket.subscribe((packet) => {
      if (packet.data.variant.case !== "errorReason") return;
      const reason = packet.data.variant.value;
      if (reason === Protobuf.Mesh.Routing_Error.NONE) return;
      // Reasons that indicate a node-level fault. Anything else is just a
      // transient packet failure and not worth surfacing per-node.
      if (
        reason === Protobuf.Mesh.Routing_Error.PKI_UNKNOWN_PUBKEY ||
        reason === Protobuf.Mesh.Routing_Error.PKI_FAILED ||
        reason === Protobuf.Mesh.Routing_Error.PKI_SEND_FAIL_PUBLIC_KEY ||
        reason === Protobuf.Mesh.Routing_Error.NO_CHANNEL
      ) {
        this.setError(packet.from, reason);
      }
    });

    void this.hydrate();
  }

  private handleIncoming(info: Protobuf.Mesh.NodeInfo): void {
    const snapshot = new Map<number, Node>();
    for (const node of this.list.value) snapshot.set(node.num, node);

    const verdict = validateIncomingNode(info, snapshot);
    if (verdict.error) {
      this.setError(info.num, verdict.error);
    }
    if (!verdict.accepted) return;

    const node = NodeMapper.fromProto(verdict.accepted);
    this.store.set(node.num, node);
    // A successful update implicitly clears any prior PKI/no-channel error.
    if (this.errorsStore.has(node.num)) this.errorsStore.delete(node.num);
    void this.repository.upsert(node).catch(() => {});
  }

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

  public errorFor(nodeNum: number): NodeError | undefined {
    return this.errorsStore.get(nodeNum);
  }

  public hasError(nodeNum: number): boolean {
    return this.errorsStore.has(nodeNum);
  }

  public setError(nodeNum: number, error: NodeErrorType): void {
    this.errorsStore.set(nodeNum, { node: nodeNum, error });
  }

  public clearError(nodeNum: number): void {
    this.errorsStore.delete(nodeNum);
  }

  public clearAllErrors(): void {
    this.errorsStore.clear();
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
    this.errorsStore.delete(nodeNum);
    return removeNodeByNum(this.client, nodeNum);
  }

  public reset(): Promise<ResultType<number, Error>> {
    void this.repository.clear().catch(() => {});
    this.store.clear();
    this.errorsStore.clear();
    return resetNodes(this.client);
  }
}
