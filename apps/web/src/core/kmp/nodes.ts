import { fromBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import type { Node, NodesRepository } from "@core/storage/types.ts";
import { firmwareAtLeast } from "@core/utils/firmware.ts";
import type { NodeChangeJs } from "@meshtastic/sdk-kmp";
import { signal } from "@preact/signals-core";
import type { Result } from "better-result";
import {
  deriveSignal,
  deriveStableSignal,
  type ReadonlySignal,
  sameSet,
} from "./signals.ts";

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

/**
 * `live` with each field it leaves undefined taken from `stored`; `live`
 * itself when there is nothing to fill. The stored key verification is kept
 * only for the key it was made against.
 */
function fillUnset(live: Node, stored: Node): Node {
  const liveKey = live.user?.publicKey;
  const sameKey =
    !live.user ||
    (!!liveKey?.length && equalKey(liveKey, stored.user?.publicKey));
  let filled: Record<string, unknown> | undefined;
  for (const [key, value] of Object.entries(stored)) {
    if (value === undefined || live[key as keyof Node] !== undefined) continue;
    if (key === "isKeyManuallyVerified" && !sameKey) continue;
    filled ??= { ...live };
    filled[key] = value;
  }
  return (filled as Node | undefined) ?? live;
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
 * shown until the handshake's node DB arrives. Every batch of changed nodes
 * is written back to the repository so the stored snapshot stays current.
 */
export class NodesClient {
  private readonly nodes = signal<ReadonlyMap<number, Node>>(new Map());
  private readonly errorMap = signal<ReadonlyMap<number, NodeError>>(new Map());
  private pending: Map<number, Node> | undefined;
  private changed = new Set<number>();
  private epoch = 0;

  readonly list: ReadonlySignal<ReadonlyArray<Node>>;
  readonly errors: ReadonlySignal<ReadonlyArray<NodeError>>;
  /** Favourite node numbers; the same Set until membership changes. */
  readonly favoriteNums: ReadonlySignal<ReadonlySet<number>>;
  /** Ignored node numbers; the same Set until membership changes. */
  readonly ignoredNums: ReadonlySignal<ReadonlySet<number>>;
  /** Muted node numbers; the same Set until membership changes. */
  readonly mutedNums: ReadonlySignal<ReadonlySet<number>>;

  constructor(
    private readonly admin: NodesAdmin,
    private readonly repository?: NodesRepository,
  ) {
    this.list = deriveSignal(this.nodes, (m) => [...m.values()]);
    this.errors = deriveSignal(this.errorMap, (m) => [...m.values()]);
    const numsWhere =
      (keep: (node: Node) => boolean) =>
      (m: ReadonlyMap<number, Node>): ReadonlySet<number> =>
        new Set([...m.values()].filter(keep).map((n) => n.num));
    this.favoriteNums = deriveStableSignal(
      this.nodes,
      numsWhere((n) => n.isFavorite),
      sameSet,
    );
    this.ignoredNums = deriveStableSignal(
      this.nodes,
      numsWhere((n) => n.isIgnored),
      sameSet,
    );
    this.mutedNums = deriveStableSignal(
      this.nodes,
      numsWhere((n) => n.isMuted === true),
      sameSet,
    );
    void this.hydrate();
  }

  applyChange(change: NodeChangeJs): void {
    switch (change.kind) {
      case "snapshot": {
        const next = new Map<number, Node>();
        for (const bytes of change.nodes ?? []) {
          const info = fromBinary(Protobuf.Mesh.NodeInfoSchema, bytes);
          next.set(info.num, this.merged(info, this.current().get(info.num)));
        }
        this.replace(next);
        this.persist([...next.values()]);
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
    const verdict = validateIncomingNode(info, this.current());
    if (verdict.error) this.setError(info.num, verdict.error);
    if (!verdict.accepted) return;
    const node = this.merged(verdict.accepted, this.current().get(info.num));
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
    const existing = this.current().get(nodeNum);
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

  private current(): ReadonlyMap<number, Node> {
    return this.pending ?? this.nodes.peek();
  }

  private draft(): Map<number, Node> {
    if (!this.pending) {
      this.pending = new Map(this.nodes.peek());
      queueMicrotask(() => this.publish());
    }
    return this.pending;
  }

  private publish(): void {
    const published = this.pending;
    if (!published) return;
    this.nodes.value = published;
    this.pending = undefined;
    const changed = [...this.changed].flatMap((num) => {
      const node = published.get(num);
      return node ? [node] : [];
    });
    this.changed = new Set();
    this.persist(changed);
  }

  private persist(nodes: ReadonlyArray<Node>): void {
    if (nodes.length === 0) return;
    void this.repository?.upsertBatch(nodes).catch(() => {});
  }

  private replace(next: Map<number, Node>): void {
    this.pending = undefined;
    this.changed = new Set();
    this.nodes.value = next;
  }

  private set(node: Node): void {
    this.draft().set(node.num, node);
    this.changed.add(node.num);
  }

  private delete(nodeNum: number): void {
    if (this.current().has(nodeNum)) this.draft().delete(nodeNum);
    this.clearError(nodeNum);
    void this.repository?.remove(nodeNum).catch(() => {});
  }

  private async hydrate(): Promise<void> {
    if (!this.repository) return;
    const epoch = this.epoch;
    try {
      const persisted = await this.repository.loadAll();
      if (epoch !== this.epoch) return;
      const next = this.draft();
      for (const stored of persisted) {
        const live = next.get(stored.num);
        if (!live) {
          next.set(stored.num, stored);
          continue;
        }
        // Written before the stored copy arrived (a packet heard, a status,
        // a NodeInfo), and already persisted with its unknown fields empty:
        // fill them from the stored row and write the result back.
        const filled = fillUnset(live, stored);
        if (filled !== live) this.set(filled);
      }
    } catch {
      // nothing stored yet
    }
  }

  rescope(scope: number): void {
    this.repository?.setScope?.(scope);
    this.epoch++;
    this.replace(new Map());
    this.errorMap.value = new Map();
    void this.hydrate();
  }

  byNum(nodeNum: number): Node | undefined {
    return this.current().get(nodeNum);
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
        ? this.current().get(myNodeNum)
        : undefined;
    this.replace(me ? new Map([[me.num, me]]) : new Map());
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
