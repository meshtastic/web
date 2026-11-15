import { fromBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import type { Node, NodesRepository } from "@core/storage/types.ts";
import { firmwareAtLeast } from "@core/utils/firmware.ts";
import type { NodeChangeJs } from "@meshtastic/sdk-kmp";
import { signal } from "@preact/signals-core";
import type { Result } from "better-result";
import { deriveSignal as derive, type ReadonlySignal } from "./signals.ts";

export type NodeErrorType =
  | Protobuf.Mesh.Routing_Error
  | "MISMATCH_PKI"
  | "DUPLICATE_PKI";

export interface NodeError {
  readonly node: number;
  readonly error: NodeErrorType;
}

export function nodeFromProto(info: Protobuf.Mesh.NodeInfo): Node {
  return {
    num: info.num,
    user: info.user,
    position: info.position,
    deviceMetrics: info.deviceMetrics,
    lastHeard: info.lastHeard,
    snr: info.snr,
    channel: info.channel,
    viaMqtt: info.viaMqtt,
    hopsAway: info.hopsAway,
    isFavorite: info.isFavorite,
    isIgnored: info.isIgnored,
    isKeyManuallyVerified: info.isKeyManuallyVerified,
    isMuted: info.isMuted,
    hasXeddsaSigned: info.hasXeddsaSigned,
    heardOnCurrentLora: info.heardOnCurrentLora,
  };
}

function equalKey(a?: Uint8Array, b?: Uint8Array): boolean {
  if (!a || !b || a.byteLength !== b.byteLength) return false;
  return a.every((byte, i) => byte === b[i]);
}

export interface ValidatedNodeInfo {
  readonly accepted: Protobuf.Mesh.NodeInfo | undefined;
  readonly error: NodeErrorType | undefined;
}

/**
 * Checks an incoming NodeInfo against the known public keys: a new node
 * presenting another node's key is dropped as DUPLICATE_PKI, a known node
 * changing its key is dropped as MISMATCH_PKI, and a known node arriving
 * without a key is ignored.
 */
export function validateIncomingNode(
  incoming: Protobuf.Mesh.NodeInfo,
  existingByNum: ReadonlyMap<number, Node>,
): ValidatedNodeInfo {
  const existing = existingByNum.get(incoming.num);
  const newKey = incoming.user?.publicKey;
  if (!existing) {
    if (newKey && newKey.length > 0) {
      for (const node of existingByNum.values()) {
        const otherKey = node.user?.publicKey;
        if (otherKey && otherKey.length > 0 && equalKey(otherKey, newKey)) {
          return { accepted: undefined, error: "DUPLICATE_PKI" };
        }
      }
    }
    return { accepted: incoming, error: undefined };
  }
  const oldKey = existing.user?.publicKey;
  if (!oldKey || oldKey.length === 0 || equalKey(oldKey, newKey)) {
    return { accepted: incoming, error: undefined };
  }
  if (newKey && newKey.length > 0) {
    return { accepted: undefined, error: "MISMATCH_PKI" };
  }
  return { accepted: undefined, error: undefined };
}

export interface NodesAdmin {
  /** Sends one admin message to the local node. */
  sendAdmin(
    variant: Protobuf.Admin.AdminMessage["payloadVariant"],
  ): Promise<Result<unknown, Error>>;
  firmwareVersion(): string | undefined;
  myNodeNum(): number | undefined;
}

/**
 * The device's node DB as the SDK reports it, plus the per-node errors the
 * web tracks (PKI collisions and routing failures) and the stored snapshot
 * shown until the handshake's node DB arrives.
 */
export class NodesClient {
  private readonly nodes = signal<ReadonlyMap<number, Node>>(new Map());
  private readonly errorMap = signal<ReadonlyMap<number, NodeError>>(new Map());
  private epoch = 0;

  readonly list: ReadonlySignal<ReadonlyArray<Node>>;
  readonly errors: ReadonlySignal<ReadonlyArray<NodeError>>;

  constructor(
    private readonly admin: NodesAdmin,
    private readonly repository?: NodesRepository,
  ) {
    this.list = derive(this.nodes, (m) => [...m.values()]);
    this.errors = derive(this.errorMap, (m) => [...m.values()]);
    void this.hydrate();
  }

  applyChange(change: NodeChangeJs): void {
    switch (change.kind) {
      case "snapshot": {
        const next = new Map<number, Node>();
        for (const bytes of change.nodes ?? []) {
          const info = fromBinary(Protobuf.Mesh.NodeInfoSchema, bytes);
          next.set(
            info.num,
            this.merged(info, this.nodes.peek().get(info.num)),
          );
        }
        this.nodes.value = next;
        void this.repository?.upsertBatch([...next.values()]).catch(() => {});
        return;
      }
      case "added":
      case "updated": {
        if (change.node) {
          this.handleIncoming(
            fromBinary(Protobuf.Mesh.NodeInfoSchema, change.node),
          );
        }
        return;
      }
      case "removed": {
        this.delete(change.nodeNum);
        return;
      }
      default:
        return;
    }
  }

  private handleIncoming(info: Protobuf.Mesh.NodeInfo): void {
    const verdict = validateIncomingNode(info, this.nodes.peek());
    if (verdict.error) this.setError(info.num, verdict.error);
    if (!verdict.accepted) return;
    const node = this.merged(verdict.accepted, this.nodes.peek().get(info.num));
    this.set(node);
    if (this.errorMap.peek().has(node.num)) this.clearError(node.num);
  }

  private merged(
    info: Protobuf.Mesh.NodeInfo,
    existing: Node | undefined,
  ): Node {
    const mapped = nodeFromProto(info);
    return {
      ...mapped,
      position: mapped.position ?? existing?.position,
      deviceMetrics: mapped.deviceMetrics ?? existing?.deviceMetrics,
      status: existing?.status,
      heardOnCurrentLora:
        mapped.heardOnCurrentLora || !this.firmwareReportsHeard(),
    };
  }

  /** heard_on_current_lora exists from firmware 2.8.1. */
  private firmwareReportsHeard(): boolean {
    const version = this.admin.firmwareVersion();
    return !!version && firmwareAtLeast(version, "2.8.1");
  }

  /** Every inbound packet with a time refreshes the sender's lastHeard and snr. */
  heard(packet: Protobuf.Mesh.MeshPacket): void {
    if (!packet.rxTime) return;
    this.patch(packet.from, {
      lastHeard: packet.rxTime,
      ...(packet.rxRssi !== undefined || packet.rxSnr !== 0
        ? { snr: packet.rxSnr }
        : {}),
    });
  }

  patch(nodeNum: number, partial: Partial<Node>): void {
    if (nodeNum === 0) return;
    const existing = this.nodes.peek().get(nodeNum);
    const next: Node = existing
      ? { ...existing, ...partial }
      : { num: nodeNum, isFavorite: false, isIgnored: false, ...partial };
    this.set(next);
  }

  routingError(nodeNum: number, reason: Protobuf.Mesh.Routing_Error): void {
    const E = Protobuf.Mesh.Routing_Error;
    if (
      reason === E.PKI_UNKNOWN_PUBKEY ||
      reason === E.PKI_FAILED ||
      reason === E.PKI_SEND_FAIL_PUBLIC_KEY ||
      reason === E.NO_CHANNEL
    ) {
      this.setError(nodeNum, reason);
    }
  }

  private set(node: Node): void {
    const next = new Map(this.nodes.peek());
    next.set(node.num, node);
    this.nodes.value = next;
    void this.repository?.upsert(node).catch(() => {});
  }

  private delete(nodeNum: number): void {
    const next = new Map(this.nodes.peek());
    if (next.delete(nodeNum)) this.nodes.value = next;
    this.clearError(nodeNum);
    void this.repository?.remove(nodeNum).catch(() => {});
  }

  private async hydrate(): Promise<void> {
    if (!this.repository) return;
    const epoch = this.epoch;
    try {
      const persisted = await this.repository.loadAll();
      if (epoch !== this.epoch) return;
      const next = new Map(this.nodes.peek());
      for (const node of persisted) {
        if (!next.has(node.num)) next.set(node.num, node);
      }
      this.nodes.value = next;
    } catch {
      // nothing stored yet
    }
  }

  rescope(scope: number): void {
    this.repository?.setScope?.(scope);
    this.epoch++;
    this.nodes.value = new Map();
    this.errorMap.value = new Map();
    void this.hydrate();
  }

  byNum(nodeNum: number): Node | undefined {
    return this.nodes.peek().get(nodeNum);
  }

  errorFor(nodeNum: number): NodeError | undefined {
    return this.errorMap.peek().get(nodeNum);
  }

  hasError(nodeNum: number): boolean {
    return this.errorMap.peek().has(nodeNum);
  }

  setError(nodeNum: number, error: NodeErrorType): void {
    const next = new Map(this.errorMap.peek());
    next.set(nodeNum, { node: nodeNum, error });
    this.errorMap.value = next;
  }

  clearError(nodeNum: number): void {
    const next = new Map(this.errorMap.peek());
    if (next.delete(nodeNum)) this.errorMap.value = next;
  }

  clearAllErrors(): void {
    if (this.errorMap.peek().size > 0) this.errorMap.value = new Map();
  }

  async favorite(nodeNum: number): Promise<Result<unknown, Error>> {
    const result = await this.admin.sendAdmin({
      case: "setFavoriteNode",
      value: nodeNum,
    });
    if (result.status === "ok") this.patch(nodeNum, { isFavorite: true });
    return result;
  }

  async unfavorite(nodeNum: number): Promise<Result<unknown, Error>> {
    const result = await this.admin.sendAdmin({
      case: "removeFavoriteNode",
      value: nodeNum,
    });
    if (result.status === "ok") this.patch(nodeNum, { isFavorite: false });
    return result;
  }

  async ignore(nodeNum: number): Promise<Result<unknown, Error>> {
    const result = await this.admin.sendAdmin({
      case: "setIgnoredNode",
      value: nodeNum,
    });
    if (result.status === "ok") this.patch(nodeNum, { isIgnored: true });
    return result;
  }

  async unignore(nodeNum: number): Promise<Result<unknown, Error>> {
    const result = await this.admin.sendAdmin({
      case: "removeIgnoredNode",
      value: nodeNum,
    });
    if (result.status === "ok") this.patch(nodeNum, { isIgnored: false });
    return result;
  }

  remove(nodeNum: number): Promise<Result<unknown, Error>> {
    this.delete(nodeNum);
    return this.admin.sendAdmin({ case: "removeByNodenum", value: nodeNum });
  }

  /** Wipes every node except, optionally, our own, then resets the device's node DB. */
  async reset(
    options: { keepMyNode?: boolean } = {},
  ): Promise<Result<unknown, Error>> {
    const myNodeNum = this.admin.myNodeNum();
    const me =
      options.keepMyNode && myNodeNum !== undefined
        ? this.nodes.peek().get(myNodeNum)
        : undefined;
    this.nodes.value = me ? new Map([[me.num, me]]) : new Map();
    this.errorMap.value = new Map();
    try {
      await this.repository?.clear();
      if (me) await this.repository?.upsert(me);
    } catch {
      // storage is best effort
    }
    return this.admin.sendAdmin({ case: "nodedbReset", value: true });
  }
}
