import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { Result } from "better-result";
import type { MeshClient } from "../../core/client/MeshClient.ts";
import type { ReadonlySignal } from "../../core/signals/createStore.ts";
import type { Node } from "./domain/Node.ts";
import type { NodeError, NodeErrorType } from "./domain/NodeError.ts";
import type { NodesRepository } from "./domain/NodesRepository.ts";
import { firmwareAtLeast } from "../device/domain/FirmwareVersion.ts";
import { NodeMapper } from "./infrastructure/NodeMapper.ts";
import { InMemoryNodesRepository } from "./infrastructure/repositories/InMemoryNodesRepository.ts";
import { validateIncomingNode } from "./infrastructure/nodeValidation.ts";
import { NodeErrorsStore } from "./state/nodeErrorsStore.ts";
import { NodesStore } from "./state/nodesStore.ts";
import {
  favoriteNode,
  removeFavoriteNode,
} from "./application/FavoriteNodeUseCase.ts";
import {
  ignoreNode,
  removeIgnoredNode,
} from "./application/IgnoreNodeUseCase.ts";
import {
  removeNodeByNum,
  resetNodes,
} from "./application/RemoveNodeUseCase.ts";

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

    client.events.onNodeInfoPacket.subscribe((info) =>
      this.handleIncoming(info),
    );

    client.events.onUserPacket.subscribe((packet) => {
      this.patch(packet.from, { user: packet.data });
    });

    client.events.onPositionPacket.subscribe((packet) => {
      this.patch(packet.from, { position: packet.data });
    });

    client.events.onTelemetryPacket.subscribe((packet) => {
      // Fold live device-metrics telemetry into the node so battery / channel
      // utilisation / voltage stay current between NodeInfo broadcasts.
      if (packet.data.variant.case === "deviceMetrics") {
        this.patch(packet.from, { deviceMetrics: packet.data.variant.value });
      }
    });

    client.events.onNodeStatusPacket.subscribe((packet) => {
      this.patch(packet.from, { status: packet.data.status });
    });

    client.events.onMeshPacket.subscribe((packet) => {
      // Every inbound mesh packet refreshes lastHeard / snr for the
      // originating node. Since firmware 2.8 the device also replays each
      // node's cached position and telemetry after the handshake, with
      // rx_time set to when it last heard the node, or unset when it had no
      // wall-clock time then. A packet without rx_time says nothing about
      // when the node was heard, so it must not mark the node as heard now.
      if (!packet.rxTime) return;
      this.patch(packet.from, {
        lastHeard: packet.rxTime,
        snr: packet.rxSnr,
      });
    });

    client.events.onRoutingPacket.subscribe((packet) => {
      if (packet.data.variant.case !== "errorReason") return;
      const reason = packet.data.variant.value;
      if (reason === Protobuf.Mesh.Routing_Error.NONE) return;
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

    const existing = this.store.get(info.num);
    const mapped = NodeMapper.fromProto(verdict.accepted);
    const node: Node = {
      ...mapped,
      // Firmware 2.8 sends NodeInfo without position or metrics and replays
      // those separately, so keep what we already know.
      position: mapped.position ?? existing?.position,
      deviceMetrics: mapped.deviceMetrics ?? existing?.deviceMetrics,
      status: existing?.status,
      heardOnCurrentLora:
        mapped.heardOnCurrentLora || !this.firmwareReportsHeard(),
    };
    this.store.set(node.num, node);
    if (this.errorsStore.has(node.num)) this.errorsStore.delete(node.num);
    void this.repository.upsert(node).catch(() => {});
  }

  /** heard_on_current_lora exists from firmware 2.8.1. */
  private firmwareReportsHeard(): boolean {
    const version = this.client.device.metadata.value?.firmwareVersion;
    return !!version && firmwareAtLeast(version, "2.8.1");
  }

  /**
   * Shallow-merges a partial Node update over the existing entry. Creates a
   * stub Node if none exists yet — matches the legacy nodeDB behaviour
   * where a stray UserPacket / PositionPacket / mesh packet would seed a
   * placeholder NodeInfo.
   */
  private patch(nodeNum: number, partial: Partial<Node>): void {
    if (nodeNum === 0) return;
    const existing = this.store.get(nodeNum);
    const next: Node = existing
      ? { ...existing, ...partial }
      : {
          num: nodeNum,
          isFavorite: false,
          isIgnored: false,
          ...partial,
        };
    this.store.set(nodeNum, next);
    void this.repository.upsert(next).catch(() => {});
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

  public async favorite(nodeNum: number): Promise<Result<number, Error>> {
    const result = await favoriteNode(this.client, nodeNum);
    if (result.status === "ok") this.patch(nodeNum, { isFavorite: true });
    return result;
  }

  public async unfavorite(nodeNum: number): Promise<Result<number, Error>> {
    const result = await removeFavoriteNode(this.client, nodeNum);
    if (result.status === "ok") this.patch(nodeNum, { isFavorite: false });
    return result;
  }

  public async ignore(nodeNum: number): Promise<Result<number, Error>> {
    const result = await ignoreNode(this.client, nodeNum);
    if (result.status === "ok") this.patch(nodeNum, { isIgnored: true });
    return result;
  }

  public async unignore(nodeNum: number): Promise<Result<number, Error>> {
    const result = await removeIgnoredNode(this.client, nodeNum);
    if (result.status === "ok") this.patch(nodeNum, { isIgnored: false });
    return result;
  }

  public remove(nodeNum: number): Promise<Result<number, Error>> {
    void this.repository.remove(nodeNum).catch(() => {});
    this.store.delete(nodeNum);
    this.errorsStore.delete(nodeNum);
    return removeNodeByNum(this.client, nodeNum);
  }

  /**
   * Wipes every node except (optionally) the local "my node" entry, then
   * sends the device-side reset admin message. Mirrors the legacy
   * removeAllNodes(true) + resetNodes flow that the ResetNodeDb dialog
   * relied on.
   */
  public async reset(
    options: { keepMyNode?: boolean } = {},
  ): Promise<Result<number, Error>> {
    const myNodeNum = this.client.device.myNodeNum.value;
    if (options.keepMyNode && myNodeNum !== undefined) {
      const me = this.store.get(myNodeNum);
      this.store.clear();
      this.errorsStore.clear();
      if (me) this.store.set(myNodeNum, me);
      try {
        await this.repository.clear();
        if (me) await this.repository.upsert(me);
      } catch {
        // ok
      }
    } else {
      this.store.clear();
      this.errorsStore.clear();
      try {
        await this.repository.clear();
      } catch {
        // ok
      }
    }
    return resetNodes(this.client);
  }

  /** Drives the legacy `Protobuf.Mesh.NodeInfoSchema` create flow if a
   *  consumer needs a placeholder for a not-yet-known node. */
  public createPlaceholder(nodeNum: number): Protobuf.Mesh.NodeInfo {
    return create(Protobuf.Mesh.NodeInfoSchema, { num: nodeNum });
  }
}
