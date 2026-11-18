import { Protobuf, type Types } from "@core/protobuf.ts";
import {
  type ConversationKey,
  conversationKeyString,
  type DraftRepository,
  type Message,
  type MessageDeliveryPatch,
  type MessageRepository,
  MessageState,
  parseConversationKey,
  type RetentionPolicy,
} from "@core/storage/types.ts";
import type { SendHandleJs } from "@meshtastic/sdk-kmp";
import { type Signal, signal } from "@preact/signals-core";
import { Result } from "better-result";
import { BROADCAST_NUM } from "./packets.ts";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

export class ChatStore {
  private readonly buckets = new Map<string, Signal<Message[]>>();
  private readonly readBuckets = new Map<string, ReadonlySignal<Message[]>>();

  bucketFor(key: string): ReadonlySignal<Message[]> {
    this.writeBucket(key);
    return this.readBuckets.get(key) ?? toReadonly(this.writeBucket(key));
  }

  append(key: string, message: Message): void {
    const bucket = this.writeBucket(key);
    bucket.value = [...bucket.value, message];
  }

  /** Adds stored messages, skipping ones already held, in time order. */
  merge(key: string, messages: ReadonlyArray<Message>): void {
    if (messages.length === 0) return;
    const bucket = this.writeBucket(key);
    const seen = new Set(bucket.value.map((m) => m.id));
    const added = messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    if (added.length === 0) return;
    bucket.value = [...bucket.value, ...added].sort(
      (a, b) => a.rxTime.getTime() - b.rxTime.getTime(),
    );
  }

  hasMessage(key: string, id: number): boolean {
    return this.buckets.get(key)?.value.some((m) => m.id === id) ?? false;
  }

  prepend(key: string, message: Message): void {
    const bucket = this.writeBucket(key);
    bucket.value = [message, ...bucket.value];
  }

  clearBucket(key: string): void {
    const bucket = this.buckets.get(key);
    if (bucket && bucket.value.length > 0) bucket.value = [];
  }

  clearAll(): void {
    for (const bucket of this.buckets.values()) {
      if (bucket.value.length > 0) bucket.value = [];
    }
  }

  remove(id: number): void {
    for (const bucket of this.buckets.values()) {
      if (bucket.value.some((m) => m.id === id)) {
        bucket.value = bucket.value.filter((m) => m.id !== id);
        return;
      }
    }
  }

  getMessage(id: number): Message | undefined {
    for (const bucket of this.buckets.values()) {
      const found = bucket.value.find((m) => m.id === id);
      if (found) return found;
    }
    return undefined;
  }

  patch(id: number, patch: Partial<Message>): void {
    for (const bucket of this.buckets.values()) {
      const index = bucket.value.findIndex((m) => m.id === id);
      const existing = bucket.value[index];
      if (index === -1 || !existing) continue;
      const next = bucket.value.slice();
      next[index] = { ...existing, ...patch };
      bucket.value = next;
      return;
    }
  }

  private writeBucket(key: string): Signal<Message[]> {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = signal<Message[]>([]);
      this.buckets.set(key, bucket);
      this.readBuckets.set(key, toReadonly(bucket));
    }
    return bucket;
  }
}

export class DraftStore {
  private readonly buckets = new Map<string, Signal<string>>();
  private readonly read = new Map<string, ReadonlySignal<string>>();

  get(key: ConversationKey): ReadonlySignal<string> {
    const k = conversationKeyString(key);
    const bucket = this.ensure(k);
    return this.read.get(k) ?? toReadonly(bucket);
  }

  set(key: ConversationKey, text: string): void {
    this.ensure(conversationKeyString(key)).value = text;
  }

  reset(): void {
    for (const bucket of this.buckets.values()) bucket.value = "";
  }

  private ensure(k: string): Signal<string> {
    let bucket = this.buckets.get(k);
    if (!bucket) {
      bucket = signal("");
      this.buckets.set(k, bucket);
      this.read.set(k, toReadonly(bucket));
    }
    return bucket;
  }
}

export interface SendTextInput {
  text: string;
  destination: Types.Destination;
  channel?: Types.ChannelNumber;
  replyId?: number;
}

export class SendTextError extends Error {
  constructor(
    readonly reason: string,
    readonly routingError?: Protobuf.Mesh.Routing_Error,
  ) {
    super(`Send failed: ${reason}`);
    this.name = "SendTextError";
  }
}

export interface ChatDrafts {
  get(key: ConversationKey): ReadonlySignal<string>;
  set(key: ConversationKey, text: string): void;
  clear(key: ConversationKey): void;
}

export interface ChatUnread {
  readonly byKey: ReadonlySignal<ReadonlyMap<string, number>>;
  readonly total: ReadonlySignal<number>;
  count(key: ConversationKey): ReadonlySignal<number>;
  markRead(key: ConversationKey): void;
  /**
   * The conversation the user is looking at, or `undefined` for none. Setting
   * it marks the conversation read, and text arriving in it isn't counted.
   */
  setActive(key: ConversationKey | undefined): void;
}

export interface ChatTransport {
  myNodeNum(): number;
  sendText(
    text: string,
    to: number,
    channel: number,
    replyId?: number,
  ): SendHandleJs;
  warn(message: string, ...args: unknown[]): void;
}

export interface ChatClientOptions {
  repository?: MessageRepository;
  draftRepository?: DraftRepository;
  retention?: RetentionPolicy;
  initialLoadLimit?: number;
}

interface RoutingAck {
  from: number;
  error: Protobuf.Mesh.Routing_Error;
  proof: Protobuf.Mesh.MeshPacket_AckProofStatus | undefined;
}

const ROUTING_ERROR_BY_REASON: ReadonlyMap<
  string,
  Protobuf.Mesh.Routing_Error
> = new Map(
  Object.entries(Protobuf.Mesh.Routing_Error).flatMap(([name, value]) =>
    typeof value === "number" ? [[name, value]] : [],
  ),
);

/**
 * Chat over the Kotlin SDK: message buckets keyed by channel or peer, drafts
 * keyed the same way, unread counts, and `send`. The SDK has no message
 * store, so history lives in the web's repositories, keyed by node number.
 */
export class ChatClient {
  private readonly store = new ChatStore();
  private readonly draftStore = new DraftStore();
  private readonly repository: MessageRepository | undefined;
  private readonly draftRepository: DraftRepository | undefined;
  private readonly retention: RetentionPolicy | undefined;
  private readonly initialLoadLimit: number;
  private readonly hydrated = new Set<string>();
  private readonly draftsHydrated = new Set<string>();
  private readonly unreadByKey = signal<ReadonlyMap<string, number>>(new Map());
  private activeKey: string | undefined;
  /** Routing acks that arrived before the send they answer settled. */
  private readonly earlyAcks = new Map<number, RoutingAck[]>();
  private epoch = 0;

  readonly drafts: ChatDrafts;
  readonly unread: ChatUnread;

  constructor(
    private readonly transport: ChatTransport,
    options: ChatClientOptions = {},
  ) {
    this.repository = options.repository;
    this.draftRepository = options.draftRepository;
    this.retention = options.retention;
    this.initialLoadLimit = options.initialLoadLimit ?? 50;
    this.drafts = {
      get: (key) => this.draftFor(key),
      set: (key, text) => this.setDraft(key, text),
      clear: (key) => this.setDraft(key, ""),
    };
    this.unread = {
      byKey: toReadonly(this.unreadByKey),
      total: this.deriveTotalUnread(),
      count: (key) => this.deriveUnreadCount(key),
      markRead: (key) => this.markRead(key),
      setActive: (key) => this.setActive(key),
    };
  }

  /** Files direct messages we sent under their recipient, as older versions didn't. */
  refileSentDirect(myNodeNum: number): void {
    void this.repository?.refileSentDirect?.(myNodeNum).catch(() => {});
  }

  /** An inbound TEXT_MESSAGE_APP packet. */
  receive(packet: Types.PacketMetadata<string>): void {
    const myNodeNum = this.transport.myNodeNum();
    const message: Message = {
      id: packet.id,
      from: packet.from,
      to: packet.to,
      channel: packet.channel,
      rxTime: packet.rxTime,
      type: packet.type,
      text: packet.data,
      state: MessageState.Ack,
      signed: packet.xeddsaSigned || undefined,
      snr: packet.rxSnr,
      rssi: packet.rxRssi,
      hopsAway: packet.hopsAway,
      viaMqtt: packet.viaMqtt || undefined,
      transport: packet.transportMechanism,
    };
    const conv: ConversationKey =
      packet.type === "direct" && packet.to !== BROADCAST_NUM
        ? {
            kind: "direct",
            peer: packet.from === myNodeNum ? packet.to : packet.from,
          }
        : { kind: "channel", channel: packet.channel };
    const key = conversationKeyString(conv);
    if (this.store.hasMessage(key, message.id)) return;
    this.store.append(key, message);
    void this.persistAppend(message, conv);
    if (packet.from !== myNodeNum && key !== this.activeKey) {
      this.bumpUnread(key);
    }
  }

  /**
   * Fold one ack or NAK into the message it answers, as the Android app's
   * handleAckNak does. An ack from the addressed node means the recipient
   * got it (Ack); one from anyone else means it reached the mesh
   * (Delivered). A NAK fails it. Once the recipient has acked, later acks
   * and NAKs no longer change the state.
   */
  applyAck(
    id: number,
    from: number,
    error: Protobuf.Mesh.Routing_Error,
    proof: Protobuf.Mesh.MeshPacket_AckProofStatus | undefined,
  ): void {
    const message = this.store.getMessage(id);
    if (!message) {
      const pending = this.earlyAcks.get(id) ?? [];
      if (this.earlyAcks.size > 64) this.earlyAcks.clear();
      this.earlyAcks.set(id, [...pending, { from, error, proof }]);
      return;
    }
    const patch: MessageDeliveryPatch = {};
    if (message.state !== MessageState.Ack) {
      if (error === Protobuf.Mesh.Routing_Error.NONE) {
        patch.state =
          from === message.to ? MessageState.Ack : MessageState.Delivered;
        patch.relays = (message.relays ?? 0) + 1;
        patch.routingError = undefined;
      } else {
        patch.state = MessageState.Failed;
        patch.routingError = error;
      }
    }
    const Proof = Protobuf.Mesh.MeshPacket_AckProofStatus;
    const current = message.ackProof;
    if (
      proof !== undefined &&
      proof !== Proof.ACK_PROOF_ABSENT &&
      current !== Proof.ACK_PROOF_VALID &&
      (current !== Proof.ACK_PROOF_INVALID || proof === Proof.ACK_PROOF_VALID)
    ) {
      patch.ackProof = proof;
    }
    if (Object.keys(patch).length === 0) return;
    this.store.patch(id, patch);
    void this.repository?.updateDelivery(id, patch).catch(() => {});
  }

  resend(
    message: Pick<Message, "id" | "text" | "to" | "channel" | "type">,
  ): Promise<Result<number, SendTextError>> {
    this.store.remove(message.id);
    void this.repository?.remove(message.id).catch(() => {});
    return this.send({
      text: message.text,
      destination: message.type === "direct" ? message.to : "broadcast",
      channel: message.channel,
    });
  }

  messages(channel: Types.ChannelNumber): ReadonlySignal<Message[]> {
    const conv: ConversationKey = { kind: "channel", channel };
    this.ensureHydrated(conv);
    return this.store.bucketFor(conversationKeyString(conv));
  }

  direct(peer: number): ReadonlySignal<Message[]> {
    const conv: ConversationKey = { kind: "direct", peer };
    this.ensureHydrated(conv);
    return this.store.bucketFor(conversationKeyString(conv));
  }

  async loadOlder(
    conv: ConversationKey,
    before: Date,
    limit = 50,
  ): Promise<Message[]> {
    if (!this.repository) return [];
    const epoch = this.epoch;
    const older = await this.repository.loadBefore(conv, before, limit);
    if (epoch !== this.epoch) return [];
    const key = conversationKeyString(conv);
    for (const message of [...older].reverse())
      this.store.prepend(key, message);
    return older;
  }

  async clearConversation(conv: ConversationKey): Promise<void> {
    const key = conversationKeyString(conv);
    this.store.clearBucket(key);
    this.hydrated.delete(key);
    await this.repository?.clearConversation(conv).catch(() => {});
  }

  async clearAll(): Promise<void> {
    this.store.clearAll();
    this.hydrated.clear();
    await this.repository?.clear().catch(() => {});
  }

  /**
   * Points the repositories at another node's history and reloads every
   * conversation and draft loaded so far. Signals already handed out stay
   * valid and update in place.
   */
  rescope(scope: number): void {
    this.repository?.setScope?.(scope);
    this.draftRepository?.setScope?.(scope);
    this.epoch++;
    const conversations = [...this.hydrated];
    const drafts = [...this.draftsHydrated];
    this.store.clearAll();
    this.hydrated.clear();
    this.draftStore.reset();
    this.draftsHydrated.clear();
    if (this.unreadByKey.peek().size > 0) this.unreadByKey.value = new Map();
    for (const key of conversations)
      this.ensureHydrated(parseConversationKey(key));
    for (const key of drafts) this.draftFor(parseConversationKey(key));
  }

  async send(input: SendTextInput): Promise<Result<number, SendTextError>> {
    const to =
      typeof input.destination === "number" ? input.destination : BROADCAST_NUM;
    const conv: ConversationKey =
      typeof input.destination === "number"
        ? { kind: "direct", peer: input.destination }
        : { kind: "channel", channel: input.channel ?? 0 };
    const key = conversationKeyString(conv);
    let handle: SendHandleJs;
    try {
      handle = this.transport.sendText(
        input.text,
        to,
        input.channel ?? 0,
        input.replyId,
      );
    } catch (e) {
      return Result.err(
        new SendTextError(e instanceof Error ? e.message : String(e)),
      );
    }
    const message: Message = {
      id: handle.id,
      from: this.transport.myNodeNum(),
      to,
      channel: input.channel ?? 0,
      rxTime: new Date(),
      type: typeof input.destination === "number" ? "direct" : "broadcast",
      text: input.text,
      state: MessageState.Pending,
    };
    this.store.append(key, message);
    void this.persistAppend(message, conv);
    this.setDraft(conv, "");
    for (const ack of this.earlyAcks.get(handle.id) ?? []) {
      this.applyAck(handle.id, ack.from, ack.error, ack.proof);
    }
    this.earlyAcks.delete(handle.id);

    const outcome = await handle.outcome;
    const settled = this.store.getMessage(handle.id);
    if (outcome.ok) {
      if (settled?.state === MessageState.Pending) {
        this.patchDelivery(handle.id, { state: MessageState.Delivered });
      }
      return Result.ok(handle.id);
    }
    const reason = outcome.reason ?? "unknown";
    const routingError = ROUTING_ERROR_BY_REASON.get(reason);
    if (settled?.state !== MessageState.Ack) {
      this.patchDelivery(handle.id, {
        state: MessageState.Failed,
        ...(routingError === undefined ? {} : { routingError }),
      });
    }
    return Result.err(new SendTextError(reason, routingError));
  }

  private patchDelivery(id: number, patch: MessageDeliveryPatch): void {
    this.store.patch(id, patch);
    void this.repository?.updateDelivery(id, patch).catch(() => {});
  }

  private ensureHydrated(conv: ConversationKey): void {
    const key = conversationKeyString(conv);
    if (this.hydrated.has(key) || !this.repository) return;
    this.hydrated.add(key);
    const epoch = this.epoch;
    void this.repository
      .loadRecent(conv, this.initialLoadLimit)
      .then((recent) => {
        if (epoch === this.epoch) this.store.merge(key, recent);
      })
      .catch(() => {});
  }

  private draftFor(conv: ConversationKey): ReadonlySignal<string> {
    const key = conversationKeyString(conv);
    if (!this.draftsHydrated.has(key) && this.draftRepository) {
      this.draftsHydrated.add(key);
      const epoch = this.epoch;
      void this.draftRepository
        .load(conv)
        .then((stored) => {
          if (epoch === this.epoch && stored) this.draftStore.set(conv, stored);
        })
        .catch(() => {});
    }
    return this.draftStore.get(conv);
  }

  private setDraft(conv: ConversationKey, text: string): void {
    this.draftsHydrated.add(conversationKeyString(conv));
    this.draftStore.set(conv, text);
    void this.draftRepository?.save(conv, text).catch(() => {});
  }

  private async persistAppend(
    message: Message,
    conv: ConversationKey,
  ): Promise<void> {
    if (!this.repository) return;
    try {
      await this.repository.append(message, conv);
      if (this.retention) await this.repository.prune(this.retention);
    } catch (e) {
      this.transport.warn("Could not save message", message.id, e);
    }
  }

  private bumpUnread(key: string): void {
    const next = new Map(this.unreadByKey.peek());
    next.set(key, (next.get(key) ?? 0) + 1);
    this.unreadByKey.value = next;
  }

  private markRead(key: ConversationKey): void {
    const k = conversationKeyString(key);
    const current = this.unreadByKey.peek();
    if ((current.get(k) ?? 0) === 0) return;
    const next = new Map(current);
    next.delete(k);
    this.unreadByKey.value = next;
  }

  private setActive(key: ConversationKey | undefined): void {
    this.activeKey = key ? conversationKeyString(key) : undefined;
    if (key) this.markRead(key);
  }

  private deriveTotalUnread(): ReadonlySignal<number> {
    const total = (m: ReadonlyMap<string, number>): number => {
      let sum = 0;
      for (const c of m.values()) sum += c;
      return sum;
    };
    return this.derive(total);
  }

  private deriveUnreadCount(key: ConversationKey): ReadonlySignal<number> {
    const k = conversationKeyString(key);
    return this.derive((m) => m.get(k) ?? 0);
  }

  private derive(
    pick: (m: ReadonlyMap<string, number>) => number,
  ): ReadonlySignal<number> {
    const src = this.unreadByKey;
    return {
      get value() {
        return pick(src.value);
      },
      peek: () => pick(src.peek()),
      subscribe: (listener) => {
        let first = true;
        return src.subscribe((m) => {
          if (first) {
            first = false;
            return;
          }
          listener(pick(m));
        });
      },
    };
  }
}
