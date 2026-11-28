import {
  EMPTY_SUMMARIES,
  mergeStored,
  type SummaryMap,
  totalUnread,
  unreadCounts,
  unreadMentions,
  withMessage,
  withMessagePatched,
  withoutConversation,
  withRead,
} from "@core/messaging/conversations.ts";
import {
  isEmptyPatch,
  reduceAck,
  reduceSendOutcome,
  type RoutingAck,
  routingErrorFromReason,
  toReactionPatch,
} from "@core/messaging/delivery.ts";
import {
  applyThreadFilter,
  filterAppliesTo,
  shouldFilterIncoming,
  type ThreadFilterResult,
} from "@core/messaging/messageFilter.ts";
import { textMentionsNode } from "@core/messaging/mentions.ts";
import { reactionKey, toggleReaction } from "@core/messaging/reactions.ts";
import {
  INITIAL_PRUNE_SCHEDULE,
  nextPrune,
  type PruneSchedule,
} from "@core/messaging/retention.ts";
import {
  classifyInboundText,
  encodeReactionPacket,
  validateReactionEmoji,
} from "@core/messaging/tapback.ts";
import {
  createThreadBuilder,
  missingReplyTargets,
  type ThreadMessage,
} from "@core/messaging/thread.ts";
import type { Protobuf, Types } from "@core/protobuf.ts";
import {
  type ConversationKey,
  conversationKeyString,
  type DraftRepository,
  type Message,
  type MessageCursor,
  type MessageDeliveryPatch,
  type MessageRef,
  type MessageRepository,
  MessageState,
  parseConversationKey,
  type Reaction,
  type ReactionDeliveryPatch,
  type RetentionPolicy,
} from "@core/storage/types.ts";
import { formatNodeId } from "@core/utils/nodeIdentity.ts";
import type { SendHandleJs } from "@meshtastic/sdk-kmp";
import { batch, computed, type Signal, signal } from "@preact/signals-core";
import { Result } from "better-result";
import type { ChatFilter } from "./messageFilter.ts";
import { BROADCAST_NUM } from "./packets.ts";
import { type ReadonlySignal, toReadonly } from "./signals.ts";

const sameItems = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a.length === b.length && a.every((item, i) => item === b[i]);

/**
 * Message order within a conversation: radio time, then local arrival
 * (`seq`). Messages not yet stored (no `seq`) arrived last.
 */
const byTimeThenArrival = (a: Message, b: Message): number =>
  a.rxTime.getTime() - b.rxTime.getTime() ||
  (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER);

/** Per-conversation message lists, oldest first. */
export class ChatStore {
  private readonly buckets = new Map<string, Signal<Message[]>>();
  private readonly readBuckets = new Map<string, ReadonlySignal<Message[]>>();

  bucketFor(key: string): ReadonlySignal<Message[]> {
    this.writeBucket(key);
    return this.readBuckets.get(key) ?? toReadonly(this.writeBucket(key));
  }

  /** The bucket's signal itself, for `computed` views over it. */
  sourceFor(key: string): Signal<Message[]> {
    return this.writeBucket(key);
  }

  /** The oldest message held for `key`, if any. */
  oldest(key: string): Message | undefined {
    return this.buckets.get(key)?.peek()[0];
  }

  append(key: string, message: Message): void {
    const bucket = this.writeBucket(key);
    bucket.value = [...bucket.value, message];
  }

  /**
   * Adds stored messages, skipping ones already held, in one update and in
   * time-then-arrival order.
   */
  merge(key: string, messages: ReadonlyArray<Message>): void {
    if (messages.length === 0) return;
    const bucket = this.writeBucket(key);
    const current = bucket.peek();
    const seen = new Set(current.map((m) => `${m.from}:${m.id}`));
    const added = messages.filter((m) => {
      const k = `${m.from}:${m.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (added.length === 0) return;
    bucket.value = [...current, ...added].sort(byTimeThenArrival);
  }

  hasMessage(key: string, id: number): boolean {
    return this.buckets.get(key)?.value.some((m) => m.id === id) ?? false;
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
    return this.locate(id)?.message;
  }

  /** The message with `id` and the conversation it is filed under. */
  locate(id: number): { key: string; message: Message } | undefined {
    for (const [key, bucket] of this.buckets) {
      const found = bucket.peek().find((m) => m.id === id);
      if (found) return { key, message: found };
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

const sameReaction = (
  a: Pick<Reaction, "targetId" | "fromNode" | "emoji">,
  b: Pick<Reaction, "targetId" | "fromNode" | "emoji">,
): boolean =>
  a.targetId === b.targetId &&
  a.fromNode === b.fromNode &&
  reactionKey(a.emoji) === reactionKey(b.emoji);

/**
 * Per-conversation reactions, one per (target, sender, emoji) like the
 * `reactions` table.
 */
export class ReactionStore {
  private readonly buckets = new Map<string, Signal<readonly Reaction[]>>();

  sourceFor(key: string): Signal<readonly Reaction[]> {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = signal<readonly Reaction[]>([]);
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  /** Adds `reactions` not already held; false when nothing was new. */
  merge(key: string, reactions: readonly Reaction[]): boolean {
    const bucket = this.sourceFor(key);
    const current = bucket.peek();
    const added: Reaction[] = [];
    for (const r of reactions) {
      if (![...current, ...added].some((c) => sameReaction(c, r))) {
        added.push(r);
      }
    }
    if (added.length === 0) return false;
    bucket.value = [...current, ...added];
    return true;
  }

  remove(
    key: string,
    match: Pick<Reaction, "targetId" | "fromNode" | "emoji">,
  ): void {
    const bucket = this.buckets.get(key);
    if (!bucket) return;
    const next = bucket.peek().filter((r) => !sameReaction(r, match));
    if (next.length !== bucket.peek().length) bucket.value = next;
  }

  forTarget(targetId: number): Reaction[] {
    return [...this.buckets.values()].flatMap((b) =>
      b.peek().filter((r) => r.targetId === targetId),
    );
  }

  /** My reaction sent as `packetId`, and the conversation it is in. */
  byPacket(
    packetId: number,
    fromNode: number,
  ): { key: string; reaction: Reaction } | undefined {
    for (const [key, bucket] of this.buckets) {
      const reaction = bucket
        .peek()
        .find((r) => r.packetId === packetId && r.fromNode === fromNode);
      if (reaction) return { key, reaction };
    }
    return undefined;
  }

  patchByPacket(
    packetId: number,
    fromNode: number,
    patch: ReactionDeliveryPatch,
  ): void {
    for (const bucket of this.buckets.values()) {
      const list = bucket.peek();
      const index = list.findIndex(
        (r) => r.packetId === packetId && r.fromNode === fromNode,
      );
      const existing = list[index];
      if (index === -1 || !existing) continue;
      const next = list.slice();
      next[index] = { ...existing, ...patch };
      bucket.value = next;
      return;
    }
  }

  clear(key: string): void {
    const bucket = this.buckets.get(key);
    if (bucket && bucket.peek().length > 0) bucket.value = [];
  }

  clearAll(): void {
    for (const bucket of this.buckets.values()) {
      if (bucket.peek().length > 0) bucket.value = [];
    }
  }
}

/**
 * Packets already filed, keyed by sender and packet id, so a packet the
 * radio hands over twice isn't counted twice, even in a conversation whose
 * messages aren't loaded. Forgets the oldest beyond `limit`.
 */
export class SeenPackets {
  private readonly keys = new Set<string>();

  constructor(private readonly limit = 2048) {}

  /** Records the packet; false when it had been seen already. */
  add(from: number, id: number): boolean {
    const key = `${from}:${id}`;
    if (this.keys.has(key)) return false;
    this.keys.add(key);
    if (this.keys.size > this.limit) {
      const oldest = this.keys.values().next();
      if (!oldest.done) this.keys.delete(oldest.value);
    }
    return true;
  }

  clear(): void {
    this.keys.clear();
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
  /** Packet id of the message this one replies to. */
  replyId?: number;
}

export interface SendReactionInput {
  /** Packet id of the message reacted to. */
  targetId: number;
  emoji: string;
  /** The conversation: the peer for a DM, "broadcast" for a channel. */
  destination: Types.Destination;
  channel?: Types.ChannelNumber;
}

export type ToggleReactionOutcome =
  | { readonly action: "added"; readonly packetId: number }
  /** Local only: Meshtastic has no packet that withdraws a reaction. */
  | { readonly action: "removed" };

/**
 * Why a send, reaction or retry didn't go out: nothing was queued or
 * stored. `reason` is the SDK's reason for refusing the packet, or one of:
 * `not-connected`, `empty-reaction`, `reaction-too-long`, `not-found`,
 * `not-failed`. A packet the mesh didn't deliver is not an error here; its
 * message or reaction is marked Failed instead.
 */
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
  /** Senders of unread messages that @mention me, per conversation. */
  readonly mentionsByKey: ReadonlySignal<
    ReadonlyMap<string, readonly number[]>
  >;
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
  /** Sends an encoded MeshPacket; the SDK assigns the id. */
  sendPacket(meshPacket: Uint8Array): SendHandleJs;
  warn(message: string, ...args: unknown[]): void;
}

export interface ChatClientOptions {
  repository?: MessageRepository;
  draftRepository?: DraftRepository;
  retention?: RetentionPolicy;
  initialLoadLimit?: number;
  /**
   * The message filter: incoming text it matches is stored as filtered
   * (never unread, never the preview) and left out of threads.
   */
  filter?: ChatFilter;
  /** Clock for retention throttling; tests pass their own. */
  now?: () => number;
  /**
   * Runs before each direct message (and retry) goes out, with the peer,
   * as Android does: the send waits for it, up to
   * {@link DIRECT_SEND_HOOK_TIMEOUT_MS}, so what it tells the radio (the
   * peer's key) arrives first. Best-effort: a rejection is ignored.
   */
  onDirectSend?: (peer: number) => Promise<void>;
}

/** How long a direct message waits for `onDirectSend` before going out. */
export const DIRECT_SEND_HOOK_TIMEOUT_MS = 3000;

/** The conversation a send to `destination` on `channel` belongs to. */
export const conversationFor = (
  destination: Types.Destination,
  channel: Types.ChannelNumber | undefined,
): { key: ConversationKey; to: number; type: Types.PacketDestination } =>
  typeof destination === "number"
    ? {
        key: { kind: "direct", peer: destination },
        to: destination,
        type: "direct",
      }
    : {
        key: { kind: "channel", channel: channel ?? 0 },
        to: BROADCAST_NUM,
        type: "broadcast",
      };

type Settled =
  | { ok: true }
  | { ok: false; reason: string; routingError?: Protobuf.Mesh.Routing_Error };

/**
 * Chat over the Kotlin SDK: message and reaction buckets keyed by channel
 * or peer, drafts keyed the same way, conversation summaries with unread
 * counts, and sending text and reactions. The SDK has no message store, so
 * history lives in the web's repositories, keyed by node number.
 */
export class ChatClient {
  private readonly store = new ChatStore();
  private readonly reactionStore = new ReactionStore();
  private readonly draftStore = new DraftStore();
  private readonly seen = new SeenPackets();
  private readonly repository: MessageRepository | undefined;
  private readonly draftRepository: DraftRepository | undefined;
  private readonly retention: RetentionPolicy | undefined;
  private readonly initialLoadLimit: number;
  private readonly now: () => number;
  private pruneSchedule: PruneSchedule = INITIAL_PRUNE_SCHEDULE;
  private readonly hydrated = new Set<string>();
  private readonly draftsHydrated = new Set<string>();
  private readonly summaryStore = signal<SummaryMap>(EMPTY_SUMMARIES);
  /** The local node number; 0 until the handshake names it. */
  private readonly me: Signal<number>;
  /** Conversations read since the summary load started. */
  private readonly readDuringHydration = new Set<string>();
  /** Unread counted per conversation since the summary load started. */
  private readonly liveUnread = new Map<string, number>();
  /** Unread mentions of me (their senders) since the summary load started. */
  private readonly liveMentions = new Map<string, number[]>();
  /** Reply targets fetched from storage because they are out of view. */
  private readonly replyTargets = signal<ReadonlyMap<number, Message>>(
    new Map(),
  );
  private readonly requestedTargets = new Set<number>();
  private readonly threads = new Map<string, ReadonlySignal<ThreadMessage[]>>();
  private readonly filteredThreads = new Map<
    string,
    ReadonlySignal<ThreadFilterResult>
  >();
  private readonly filter: ChatFilter | undefined;
  private activeKey: string | undefined;
  /** Routing acks that arrived before the send they answer settled. */
  private readonly earlyAcks = new Map<number, RoutingAck[]>();
  /** Tail of the storage write queue (see `persist`). */
  private writes: Promise<void> = Promise.resolve();
  private epoch = 0;
  private readonly onDirectSend: ((peer: number) => Promise<void>) | undefined;

  readonly drafts: ChatDrafts;
  readonly unread: ChatUnread;
  /** Every conversation with a message, keyed by `conversationKeyString`. */
  readonly summaries: ReadonlySignal<SummaryMap>;

  constructor(
    private readonly transport: ChatTransport,
    options: ChatClientOptions = {},
  ) {
    this.repository = options.repository;
    this.draftRepository = options.draftRepository;
    this.filter = options.filter;
    this.retention = options.retention;
    this.initialLoadLimit = options.initialLoadLimit ?? 50;
    this.now = options.now ?? Date.now;
    this.onDirectSend = options.onDirectSend;
    this.summaries = toReadonly(this.summaryStore);
    this.me = signal(transport.myNodeNum());
    this.drafts = {
      get: (key) => this.draftFor(key),
      set: (key, text) => this.setDraft(key, text),
      clear: (key) => this.setDraft(key, ""),
    };
    // Plain computeds: `deriveSignal` over a `toReadonly` source drops its
    // first change.
    const byKey = computed(() => unreadCounts(this.summaryStore.value));
    this.unread = {
      byKey: toReadonly(byKey),
      mentionsByKey: toReadonly(
        computed(() => unreadMentions(this.summaryStore.value)),
      ),
      total: toReadonly(computed(() => totalUnread(this.summaryStore.value))),
      count: (key) => {
        const k = conversationKeyString(key);
        return toReadonly(computed(() => byKey.value.get(k) ?? 0));
      },
      markRead: (key) => this.markRead(key),
      setActive: (key) => this.setActive(key),
    };
    this.hydrateSummaries();
  }

  /**
   * The local node number, once known: outgoing bubbles and "mine"
   * reactions depend on it, and stored unread counts are loaded with it.
   */
  setMyNodeNum(myNodeNum: number): void {
    const previous = this.me.peek();
    if (myNodeNum === previous) return;
    this.me.value = myNodeNum;
    if (previous <= 0 && myNodeNum > 0) this.hydrateSummaries();
  }

  /** An inbound TEXT_MESSAGE_APP packet: a text, or a tapback reaction. */
  receive(packet: Types.PacketMetadata<string>): void {
    if (!this.seen.add(packet.from, packet.id)) return;
    const myNodeNum = this.transport.myNodeNum();
    const conv: ConversationKey =
      packet.type === "direct" && packet.to !== BROADCAST_NUM
        ? {
            kind: "direct",
            peer: packet.from === myNodeNum ? packet.to : packet.from,
          }
        : { kind: "channel", channel: packet.channel };
    const key = conversationKeyString(conv);
    const inbound = classifyInboundText(
      packet.data,
      packet.replyId,
      packet.emoji,
    );
    if (inbound.kind === "reaction") {
      const valid = validateReactionEmoji(inbound.emoji);
      if (!valid.ok) return;
      const reaction: Reaction = {
        targetId: inbound.targetId,
        fromNode: packet.from,
        emoji: valid.emoji,
        packetId: packet.id,
        to: packet.to,
        rxTime: packet.rxTime,
        state: MessageState.Ack,
      };
      if (this.reactionStore.merge(key, [reaction])) {
        this.persist((repo) => repo.addReaction(reaction, conv));
      }
      return;
    }
    const filtered =
      this.filter !== undefined &&
      shouldFilterIncoming(
        this.filter.state.peek(),
        key,
        { from: packet.from, text: inbound.text },
        myNodeNum,
      );
    const message: Message = {
      id: packet.id,
      from: packet.from,
      to: packet.to,
      channel: packet.channel,
      rxTime: packet.rxTime,
      type: packet.type,
      text: inbound.text,
      ...(filtered ? { filtered: true } : {}),
      state: MessageState.Ack,
      replyId: inbound.replyId,
      signed: packet.xeddsaSigned || undefined,
      snr: packet.rxSnr,
      rssi: packet.rxRssi,
      hopsAway: packet.hopsAway,
      viaMqtt: packet.viaMqtt || undefined,
      transport: packet.transportMechanism,
      // Only a message from another node keeps the relay it came through.
      // Our own text echoed back (sent by another app on this radio) carries
      // our byte, and an outgoing message may only show its ack's relay;
      // before the handshake names our node, an echo can't be told apart.
      relayNode:
        myNodeNum > 0 && packet.from !== myNodeNum
          ? packet.relayNode || undefined
          : undefined,
    };
    if (this.store.hasMessage(key, message.id)) return;
    this.store.append(key, message);
    const active = key === this.activeKey;
    // A filtered message is neither unread nor the preview (as on Android).
    const countUnread = packet.from !== myNodeNum && !active && !filtered;
    const mentionsMe =
      countUnread && textMentionsNode(inbound.text, formatNodeId(myNodeNum));
    if (countUnread) {
      this.liveUnread.set(key, (this.liveUnread.get(key) ?? 0) + 1);
    }
    if (mentionsMe) {
      this.liveMentions.set(key, [
        ...(this.liveMentions.get(key) ?? []),
        packet.from,
      ]);
    }
    if (!filtered) {
      this.summaryStore.value = withMessage(
        this.summaryStore.peek(),
        conv,
        message,
        countUnread,
        mentionsMe,
      );
    }
    this.persistAppend(message, conv, active);
    this.fetchReplyTargets([message]);
  }

  /**
   * One ack or NAK for an outgoing message or reaction (`id`). `relayNode`
   * is the relay byte it came back through, cleared beforehand when it
   * names no relay (see `packetRelayNode`).
   */
  applyAck(
    id: number,
    from: number,
    error: Protobuf.Mesh.Routing_Error,
    proof: Protobuf.Mesh.MeshPacket_AckProofStatus | undefined,
    relayNode?: number,
  ): void {
    const ack: RoutingAck = {
      from,
      error,
      proof,
      ...(relayNode === undefined ? {} : { relayNode }),
    };
    const message = this.store.getMessage(id);
    if (message) {
      this.patchDelivery(message, reduceAck(message, ack));
      return;
    }
    const mine = this.reactionStore.byPacket(id, this.transport.myNodeNum());
    if (mine) {
      this.patchReaction(
        mine.reaction,
        toReactionPatch(reduceAck(mine.reaction, ack)),
      );
      return;
    }
    const pending = this.earlyAcks.get(id) ?? [];
    if (this.earlyAcks.size > 64) this.earlyAcks.clear();
    this.earlyAcks.set(id, [...pending, ack]);
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

  /**
   * A conversation as the message list renders it: messages oldest first
   * with reply targets resolved, reaction chips (with my reactions'
   * delivery) and delivery state. Unchanged bubbles keep their identity.
   * Incoming messages the message filter matches are left out, or marked
   * `filtered` while the conversation's filtered messages are revealed;
   * the filter's current words apply, so editing them updates open
   * threads.
   */
  thread(conv: ConversationKey): ReadonlySignal<ThreadMessage[]> {
    this.ensureHydrated(conv);
    const key = conversationKeyString(conv);
    const cached = this.threads.get(key);
    if (cached) return cached;
    const filtered = this.filteredThread(conv);
    // Not `deriveSignal`: over a `toReadonly` source it drops the first change.
    const view = toReadonly(computed(() => filtered.value.messages));
    this.threads.set(key, view);
    return view;
  }

  /**
   * How many loaded incoming messages of a conversation the message filter
   * matches (0 while it doesn't apply there), shown or not.
   */
  filteredCount(conv: ConversationKey): ReadonlySignal<number> {
    const filtered = this.filteredThread(conv);
    return toReadonly(computed(() => filtered.value.filtered));
  }

  private filteredThread(
    conv: ConversationKey,
  ): ReadonlySignal<ThreadFilterResult> {
    this.ensureHydrated(conv);
    const key = conversationKeyString(conv);
    const cached = this.filteredThreads.get(key);
    if (cached) return cached;
    const messages = this.store.sourceFor(key);
    const reactions = this.reactionStore.sourceFor(key);
    const targets = this.replyTargets;
    const build = createThreadBuilder();
    const filter = this.filter;
    const revealed = filter?.revealed(key);
    // Revealed bubbles keep their identity too.
    const marked = new WeakMap<ThreadMessage, ThreadMessage>();
    let last: ThreadFilterResult | undefined;
    const mark = (item: ThreadMessage): ThreadMessage => {
      const hit = marked.get(item);
      if (hit) return hit;
      const value = { ...item, filtered: true };
      marked.set(item, value);
      return value;
    };
    const view = toReadonly(
      computed((): ThreadFilterResult => {
        const refs = targets.value;
        const me = this.me.value;
        const thread = build(messages.value, reactions.value, {
          myNodeNum: me > 0 ? me : undefined,
          lookup: (id) => refs.get(id),
        });
        if (!filter) return { messages: thread, filtered: 0 };
        const state = filter.state.value;
        const next = applyThreadFilter(thread, {
          active: filterAppliesTo(state, key),
          matcher: state.matcher,
          reveal: revealed?.value ?? false,
          mark,
        });
        // A filter change that shows the same bubbles keeps the same list,
        // so the message list doesn't re-render for nothing.
        const kept =
          last !== undefined && sameItems(last.messages, next.messages)
            ? { messages: last.messages, filtered: next.filtered }
            : next;
        last = kept;
        return kept;
      }),
    );
    this.filteredThreads.set(key, view);
    return view;
  }

  /**
   * Loads a page of older history. Without `before` the page ends at the
   * oldest message held; a `Date` (older callers) is matched against it so
   * messages sharing that second aren't skipped.
   */
  async loadOlder(
    conv: ConversationKey,
    before?: Date | MessageCursor,
    limit = 50,
  ): Promise<Message[]> {
    if (!this.repository) return [];
    const key = conversationKeyString(conv);
    const cursor = this.cursorFor(key, before);
    if (!cursor) return [];
    const epoch = this.epoch;
    const older = await this.repository.loadBefore(conv, cursor, limit);
    if (epoch !== this.epoch) return [];
    for (const m of older) this.seen.add(m.from, m.id);
    this.store.merge(key, older);
    this.loadReactionsFor(key, older);
    this.fetchReplyTargets(older);
    return older;
  }

  async clearConversation(conv: ConversationKey): Promise<void> {
    const key = conversationKeyString(conv);
    batch(() => {
      this.store.clearBucket(key);
      this.reactionStore.clear(key);
      this.summaryStore.value = withoutConversation(
        this.summaryStore.peek(),
        conv,
      );
    });
    this.hydrated.delete(key);
    await this.enqueue((repo) => repo.clearConversation(conv));
  }

  async clearAll(): Promise<void> {
    batch(() => {
      this.store.clearAll();
      this.reactionStore.clearAll();
      this.summaryStore.value = EMPTY_SUMMARIES;
    });
    this.hydrated.clear();
    await this.enqueue((repo) => repo.clear());
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
    batch(() => {
      this.store.clearAll();
      this.reactionStore.clearAll();
      this.draftStore.reset();
      if (this.replyTargets.peek().size > 0) {
        this.replyTargets.value = new Map();
      }
      this.summaryStore.value = EMPTY_SUMMARIES;
    });
    this.hydrated.clear();
    this.draftsHydrated.clear();
    this.requestedTargets.clear();
    this.seen.clear();
    this.pruneSchedule = INITIAL_PRUNE_SCHEDULE;
    this.hydrateSummaries();
    for (const key of conversations)
      this.ensureHydrated(parseConversationKey(key));
    for (const key of drafts) this.draftFor(parseConversationKey(key));
  }

  /**
   * Sends text, optionally as a reply, and tracks its delivery. Err only
   * when the SDK refused the packet, so nothing was stored or sent. Once it
   * is queued the result is Ok with its packet id, whatever the mesh does
   * with it: a delivery failure is the message's Failed state (with Retry),
   * not a failed send. Resolves when the SDK's verdict is recorded. Leaves
   * drafts alone; the composer owns them, and a retry mustn't wipe what is
   * being typed.
   */
  async send(input: SendTextInput): Promise<Result<number, SendTextError>> {
    const target = conversationFor(input.destination, input.channel);
    const channel = input.channel ?? 0;
    if (target.type === "direct") await this.beforeDirectSend(target.to);
    let handle: SendHandleJs;
    try {
      handle = this.transport.sendText(
        input.text,
        target.to,
        channel,
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
      to: target.to,
      channel,
      rxTime: new Date(this.now()),
      type: target.type,
      text: input.text,
      state: MessageState.Pending,
      ...(input.replyId ? { replyId: input.replyId } : {}),
    };
    this.seen.add(message.from, message.id);
    batch(() => {
      this.store.append(conversationKeyString(target.key), message);
      this.summaryStore.value = withMessage(
        this.summaryStore.peek(),
        target.key,
        message,
        false,
      );
    });
    this.persistAppend(message, target.key, false);
    this.replayEarlyAcks(handle.id);

    const outcome = await this.settle(handle);
    const settled = this.store.getMessage(handle.id);
    if (settled)
      this.patchDelivery(settled, reduceSendOutcome(settled, outcome));
    return Result.ok(handle.id);
  }

  private async beforeDirectSend(peer: number): Promise<void> {
    if (!this.onDirectSend) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      this.onDirectSend(peer).catch(() => {}),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, DIRECT_SEND_HOOK_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timer);
  }

  /** `send`, under the name the UI's action set uses. */
  sendText(input: SendTextInput): Promise<Result<number, SendTextError>> {
    return this.send(input);
  }

  /**
   * Sends a tapback (see core/messaging/tapback.ts for the wire format) and
   * shows it at once as mine, tracking its delivery like text: Ok once
   * queued, with a delivery failure left to the reaction's state.
   */
  async sendReaction(
    input: SendReactionInput,
  ): Promise<Result<number, SendTextError>> {
    const valid = validateReactionEmoji(input.emoji);
    if (!valid.ok) return Result.err(emojiError(valid.error));
    const target = conversationFor(input.destination, input.channel);
    let handle: SendHandleJs;
    try {
      handle = this.transport.sendPacket(
        encodeReactionPacket({
          emoji: valid.emoji,
          targetId: input.targetId,
          to: target.to,
          channel: input.channel ?? 0,
        }),
      );
    } catch (e) {
      return Result.err(
        new SendTextError(e instanceof Error ? e.message : String(e)),
      );
    }
    const reaction: Reaction = {
      targetId: input.targetId,
      fromNode: this.transport.myNodeNum(),
      emoji: valid.emoji,
      packetId: handle.id,
      to: target.to,
      rxTime: new Date(this.now()),
      state: MessageState.Pending,
    };
    const key = conversationKeyString(target.key);
    batch(() => {
      this.reactionStore.remove(key, reaction);
      this.reactionStore.merge(key, [reaction]);
    });
    this.persist(async (repo) => {
      await repo.removeReaction(
        reaction.targetId,
        reaction.fromNode,
        reaction.emoji,
      );
      await repo.addReaction(reaction, target.key);
    });
    this.replayEarlyAcks(handle.id);

    const outcome = await this.settle(handle);
    const settled = this.reactionStore.byPacket(handle.id, reaction.fromNode);
    if (settled) {
      this.patchReaction(
        settled.reaction,
        toReactionPatch(reduceSendOutcome(settled.reaction, outcome)),
      );
    }
    return Result.ok(handle.id);
  }

  /**
   * Adds my `emoji` to the target, or takes it away if I already sent it.
   * Taking it away is local only: no Meshtastic packet withdraws a reaction
   * (the Android app doesn't either), so other nodes keep showing it.
   */
  async toggleReaction(
    input: SendReactionInput,
  ): Promise<Result<ToggleReactionOutcome, SendTextError>> {
    const valid = validateReactionEmoji(input.emoji);
    if (!valid.ok) return Result.err(emojiError(valid.error));
    const emoji = valid.emoji;
    const me = this.transport.myNodeNum();
    const events = this.reactionStore
      .forTarget(input.targetId)
      .map((r) => ({ emoji: r.emoji, fromNode: r.fromNode }));
    const toggle = toggleReaction(events, emoji, me);
    if (toggle.action === "remove") {
      const { key } = conversationFor(input.destination, input.channel);
      const mine = { targetId: input.targetId, fromNode: me, emoji };
      this.reactionStore.remove(conversationKeyString(key), mine);
      this.persist((repo) =>
        repo.removeReaction(mine.targetId, mine.fromNode, mine.emoji),
      );
      return Result.ok({ action: "removed" });
    }
    const sent = await this.sendReaction({ ...input, emoji });
    return sent.map((packetId): ToggleReactionOutcome => ({
      action: "added",
      packetId,
    }));
  }

  /**
   * Sends a failed message (or reaction) of mine again with the same text,
   * reply and conversation. The failed copy is replaced by the new packet.
   */
  async retry(id: number): Promise<Result<number, SendTextError>> {
    const located = this.store.locate(id);
    if (located) {
      const { message } = located;
      if (message.state !== MessageState.Failed) {
        return Result.err(new SendTextError("not-failed"));
      }
      return this.resend(message);
    }
    const mine = this.reactionStore.byPacket(id, this.transport.myNodeNum());
    if (!mine) return Result.err(new SendTextError("not-found"));
    const { reaction, key } = mine;
    if (reaction.state !== MessageState.Failed) {
      return Result.err(new SendTextError("not-failed"));
    }
    const conv = parseConversationKey(key);
    return this.sendReaction({
      targetId: reaction.targetId,
      emoji: reaction.emoji,
      destination: conv.kind === "direct" ? conv.peer : "broadcast",
      channel: conv.kind === "channel" ? conv.channel : undefined,
    });
  }

  /** Sends `message` again, dropping the old copy. */
  resend(
    message: Pick<Message, "id" | "text" | "to" | "channel" | "type"> &
      Partial<Pick<Message, "replyId" | "from">>,
  ): Promise<Result<number, SendTextError>> {
    const held = this.store.getMessage(message.id);
    const replyId = message.replyId ?? held?.replyId;
    const ref: MessageRef = {
      id: message.id,
      from: message.from ?? held?.from ?? this.transport.myNodeNum(),
    };
    this.store.remove(message.id);
    this.persist((repo) => repo.remove(ref));
    return this.send({
      text: message.text,
      destination: message.type === "direct" ? message.to : "broadcast",
      channel: message.channel,
      ...(replyId ? { replyId } : {}),
    });
  }

  /** Resolves once every storage write queued so far has run. */
  flush(): Promise<void> {
    return this.writes;
  }

  /** Marks the conversation read, here and in storage. */
  markRead(key: ConversationKey): void {
    const k = conversationKeyString(key);
    this.readDuringHydration.add(k);
    this.liveUnread.delete(k);
    this.liveMentions.delete(k);
    this.summaryStore.value = withRead(this.summaryStore.peek(), key);
    this.persist((repo) => repo.markRead(key));
  }

  private cursorFor(
    key: string,
    before: Date | MessageCursor | undefined,
  ): MessageCursor | undefined {
    const oldest = this.store.oldest(key);
    if (before === undefined) {
      return oldest ? { rxTime: oldest.rxTime, seq: oldest.seq } : undefined;
    }
    if (!(before instanceof Date)) return before;
    return oldest?.seq !== undefined &&
      oldest.rxTime.getTime() === before.getTime()
      ? { rxTime: before, seq: oldest.seq }
      : { rxTime: before };
  }

  private async settle(handle: SendHandleJs): Promise<Settled> {
    const outcome = await handle.outcome;
    if (outcome.ok) return { ok: true };
    const reason = outcome.reason ?? "unknown";
    const routingError = routingErrorFromReason(reason);
    return routingError === undefined
      ? { ok: false, reason }
      : { ok: false, reason, routingError };
  }

  private replayEarlyAcks(id: number): void {
    for (const ack of this.earlyAcks.get(id) ?? []) {
      this.applyAck(id, ack.from, ack.error, ack.proof, ack.relayNode);
    }
    this.earlyAcks.delete(id);
  }

  private patchDelivery(message: Message, patch: MessageDeliveryPatch): void {
    if (isEmptyPatch(patch)) return;
    const ref: MessageRef = { id: message.id, from: message.from };
    batch(() => {
      this.store.patch(message.id, patch);
      this.summaryStore.value = withMessagePatched(
        this.summaryStore.peek(),
        message.id,
        patch,
      );
    });
    this.persist((repo) => repo.updateDelivery(ref, patch));
  }

  private patchReaction(
    reaction: Reaction,
    patch: ReactionDeliveryPatch,
  ): void {
    if (isEmptyPatch(patch)) return;
    const ref = { packetId: reaction.packetId, fromNode: reaction.fromNode };
    this.reactionStore.patchByPacket(ref.packetId, ref.fromNode, patch);
    this.persist((repo) => repo.updateReactionDelivery(ref, patch));
  }

  /**
   * Queues a storage write without blocking or failing the caller. Writes
   * run one after another in call order, so e.g. adding then removing a
   * reaction can't land in storage the other way round; a failed write is
   * logged and the queue carries on. A repository missing a method (or
   * throwing synchronously) is a logged failure, not a crash.
   */
  private persist(write: (repo: MessageRepository) => Promise<unknown>): void {
    void this.enqueue(write);
  }

  /** `persist`, resolving once the write has run. */
  private enqueue(
    write: (repo: MessageRepository) => Promise<unknown>,
  ): Promise<void> {
    const repo = this.repository;
    if (!repo) return Promise.resolve();
    this.writes = this.writes
      .then(() => write(repo))
      .then(
        () => {},
        (e: unknown) => this.transport.warn("Chat storage write failed", e),
      );
    return this.writes;
  }

  /**
   * Loads every conversation's preview and unread count from storage. Waits
   * for the local node number (unread excludes my own messages) and for
   * the writes queued so far, so storage has every message counted before
   * the load started; ones counted since are added on top. Conversations
   * read while the load was in flight stay read.
   */
  private hydrateSummaries(): void {
    const repo = this.repository;
    const me = this.me.peek();
    if (!repo || me <= 0) return;
    const epoch = this.epoch;
    this.readDuringHydration.clear();
    this.liveUnread.clear();
    this.liveMentions.clear();
    void this.writes
      .then(() => repo.loadConversations(me))
      .then((stored) => {
        if (epoch !== this.epoch) return;
        // A read during the load clears what storage held, not what was
        // counted after it.
        const read = new Set(this.readDuringHydration);
        if (this.activeKey) read.add(this.activeKey);
        let next = mergeStored(
          this.summaryStore.peek(),
          stored.map((s) =>
            read.has(conversationKeyString(s.key))
              ? { key: s.key, lastMessage: s.lastMessage, unread: 0 }
              : s,
          ),
          this.liveUnread,
          this.liveMentions,
        );
        if (this.activeKey) {
          next = withRead(next, parseConversationKey(this.activeKey));
        }
        this.summaryStore.value = next;
      })
      .catch(() => {});
  }

  private ensureHydrated(conv: ConversationKey): void {
    const key = conversationKeyString(conv);
    const repo = this.repository;
    if (this.hydrated.has(key) || !repo) return;
    this.hydrated.add(key);
    const epoch = this.epoch;
    void Promise.resolve()
      .then(() => repo.loadRecent(conv, this.initialLoadLimit))
      .then((recent) => {
        if (epoch !== this.epoch) return;
        for (const m of recent) this.seen.add(m.from, m.id);
        this.store.merge(key, recent);
        this.loadReactionsFor(key, recent);
        this.fetchReplyTargets(recent);
      })
      .catch(() => {});
  }

  private loadReactionsFor(key: string, messages: readonly Message[]): void {
    const repo = this.repository;
    if (!repo || messages.length === 0) return;
    const epoch = this.epoch;
    void Promise.resolve()
      .then(() => repo.loadReactions(messages.map((m) => m.id)))
      .then((reactions) => {
        if (epoch === this.epoch) this.reactionStore.merge(key, reactions);
      })
      .catch(() => {});
  }

  /** Loads reply targets that aren't in view, so replies can quote them. */
  private fetchReplyTargets(messages: readonly Message[]): void {
    const repo = this.repository;
    if (!repo) return;
    const missing = missingReplyTargets(
      messages,
      (id) =>
        this.requestedTargets.has(id) ||
        this.store.getMessage(id) !== undefined,
    );
    if (missing.length === 0) return;
    for (const id of missing) this.requestedTargets.add(id);
    const epoch = this.epoch;
    void Promise.resolve()
      .then(() => repo.findByIds(missing))
      .then((found) => {
        if (epoch !== this.epoch || found.length === 0) return;
        const next = new Map(this.replyTargets.peek());
        for (const m of found) next.set(m.id, m);
        this.replyTargets.value = next;
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

  /**
   * Stores a message; a message arriving in the open conversation also
   * moves its read marker past it. Retention runs on a throttle (see
   * core/messaging/retention.ts), not on every append.
   */
  private persistAppend(
    message: Message,
    conv: ConversationKey,
    markRead: boolean,
  ): void {
    const retention = this.retention;
    let prune = false;
    if (retention) {
      const step = nextPrune(this.pruneSchedule, this.now());
      this.pruneSchedule = step.schedule;
      prune = step.prune;
    }
    this.persist(async (repo) => {
      await repo.append(message, conv);
      if (markRead) await repo.markRead(conv);
      if (prune && retention) await repo.prune(retention);
    });
  }

  private setActive(key: ConversationKey | undefined): void {
    this.activeKey = key ? conversationKeyString(key) : undefined;
    if (key) this.markRead(key);
  }
}

const emojiError = (error: "empty" | "tooLong"): SendTextError =>
  new SendTextError(error === "empty" ? "empty-reaction" : "reaction-too-long");
