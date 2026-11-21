import type { Protobuf, Types } from "@core/protobuf.ts";

/**
 * Delivery state of a message, after the Android app's MessageStatus.
 *
 * - Pending: handed to the radio, no ack yet.
 * - Delivered: acked by a relay, or the radio heard it rebroadcast.
 * - Ack: the addressed node acked it (and every inbound message).
 * - Failed: a NAK or a local error; see Message.routingError.
 */
export enum MessageState {
  Pending = "pending",
  Delivered = "delivered",
  Ack = "ack",
  Failed = "failed",
}

export interface Message {
  readonly id: number;
  readonly from: number;
  readonly to: number;
  readonly channel: Types.ChannelNumber;
  readonly rxTime: Date;
  readonly type: Types.PacketDestination;
  readonly text: string;
  readonly state: MessageState;
  /** Received with an XEdDSA signature the device verified. */
  readonly signed?: boolean;
  /** Proof-of-delivery verdict from the ack (firmware 2.8.1+). */
  readonly ackProof?: Protobuf.Mesh.MeshPacket_AckProofStatus;
  /** Why a Failed message failed, from the NAK or the local queue. */
  readonly routingError?: Protobuf.Mesh.Routing_Error;
  /** How many acks (relays and the recipient) came back for it. */
  readonly relays?: number;
  readonly snr?: number;
  readonly rssi?: number;
  readonly hopsAway?: number;
  readonly viaMqtt?: boolean;
  readonly transport?: Protobuf.Mesh.MeshPacket_TransportMechanism;
  /** Packet id of the message this one replies to (Data.reply_id). */
  readonly replyId?: number;
  /**
   * Local arrival order, set on messages loaded from storage. Ties on
   * `rxTime` are paged by it (see `MessageCursor`).
   */
  readonly seq?: number;
}

/**
 * Where a page of older history ends: messages strictly before
 * (`rxTime`, `seq`). Without a `seq` every message at `rxTime` counts as
 * older.
 */
export interface MessageCursor {
  readonly rxTime: Date;
  readonly seq?: number;
}

/** Identifies a stored message: packet ids are only unique per sender. */
export interface MessageRef {
  readonly id: number;
  readonly from: number;
}

/**
 * A tapback: `fromNode` reacted to message `targetId` with `emoji`. Mine
 * carry the delivery state of the packet that sent them (`packetId`);
 * received ones are Ack.
 */
export interface Reaction {
  readonly targetId: number;
  readonly fromNode: number;
  readonly emoji: string;
  readonly packetId: number;
  /** Where the reaction packet went: the peer, or broadcast. */
  readonly to: number;
  readonly rxTime: Date;
  readonly state: MessageState;
  readonly routingError?: Protobuf.Mesh.Routing_Error;
}

/** Fields an ack or NAK can change on a stored reaction. */
export type ReactionDeliveryPatch = {
  -readonly [K in "state" | "routingError"]?: Reaction[K];
};

/** A conversation as the sidebar first loads it from storage. */
export interface StoredConversation {
  readonly key: ConversationKey;
  /** Latest text message (reactions never count). */
  readonly lastMessage: Message;
  /** Messages from others after the conversation's read marker. */
  readonly unread: number;
}

/** Fields an ack or NAK can change on a stored message. */
export type MessageDeliveryPatch = {
  -readonly [
    K in "state" | "ackProof" | "routingError" | "relays"
  ]?: Message[K];
};

/** Broadcast messages are keyed by channel; direct ones by the peer. */
export type ConversationKey =
  | { kind: "channel"; channel: Types.ChannelNumber }
  | { kind: "direct"; peer: number };

export interface RetentionPolicy {
  olderThanMs?: number;
  maxPerBucket?: number;
}

export interface MessageRepository {
  loadRecent(key: ConversationKey, limit: number): Promise<Message[]>;
  loadBefore(
    key: ConversationKey,
    cursor: MessageCursor,
    limit: number,
  ): Promise<Message[]>;
  /**
   * Stores a message under `key` when known: a direct message we sent
   * belongs to its recipient, which `message` alone can't tell apart from
   * one we received. Without it the key is inferred from the sender.
   */
  append(message: Message, key?: ConversationKey): Promise<void>;
  appendBatch(messages: ReadonlyArray<Message>): Promise<void>;
  updateState(ref: MessageRef, state: MessageState): Promise<void>;
  updateDelivery(ref: MessageRef, patch: MessageDeliveryPatch): Promise<void>;
  remove(ref: MessageRef): Promise<void>;
  prune(policy: RetentionPolicy): Promise<void>;
  clearConversation(key: ConversationKey): Promise<void>;
  clear(): Promise<void>;
  /** Stored messages with these packet ids, e.g. reply targets out of view. */
  findByIds(ids: ReadonlyArray<number>): Promise<Message[]>;
  /** Every reaction to any of these messages. */
  loadReactions(targetIds: ReadonlyArray<number>): Promise<Reaction[]>;
  /** Stores a reaction; one per (target, sender, emoji), first one wins. */
  addReaction(reaction: Reaction, key: ConversationKey): Promise<void>;
  removeReaction(
    targetId: number,
    fromNode: number,
    emoji: string,
  ): Promise<void>;
  /** Patches the reaction `fromNode` sent as packet `packetId`. */
  updateReactionDelivery(
    ref: { readonly packetId: number; readonly fromNode: number },
    patch: ReactionDeliveryPatch,
  ): Promise<void>;
  /**
   * Every conversation with a message, with its latest message and how many
   * messages not from `myNodeNum` arrived after its read marker.
   */
  loadConversations(myNodeNum: number): Promise<StoredConversation[]>;
  /** Moves the conversation's read marker past every stored message. */
  markRead(key: ConversationKey): Promise<void>;
  /** Points every later read and write at another node's history. */
  setScope?(scope: number): void;
}

export interface DraftRepository {
  load(key: ConversationKey): Promise<string>;
  save(key: ConversationKey, text: string): Promise<void>;
  clear(key: ConversationKey): Promise<void>;
  loadAll(): Promise<ReadonlyArray<{ key: ConversationKey; text: string }>>;
  setScope?(scope: number): void;
}

export interface Node {
  readonly num: number;
  readonly user?: Protobuf.Mesh.User;
  readonly position?: Protobuf.Mesh.Position;
  readonly deviceMetrics?: Protobuf.Telemetry.DeviceMetrics;
  readonly lastHeard?: number;
  readonly snr?: number;
  readonly channel?: number;
  readonly viaMqtt?: boolean;
  readonly hopsAway?: number;
  readonly isFavorite: boolean;
  readonly isIgnored: boolean;
  readonly isKeyManuallyVerified?: boolean;
  readonly isMuted?: boolean;
  /** The node signs its packets with XEdDSA (firmware 2.8+). */
  readonly hasXeddsaSigned?: boolean;
  /**
   * Heard over LoRa since the radio's current LoRa settings took effect.
   * Firmware older than 2.8.1 doesn't report it, so every node counts as
   * heard there.
   */
  readonly heardOnCurrentLora?: boolean;
  /** Latest status message the node broadcast (NODE_STATUS_APP). */
  readonly status?: string;
}

export interface NodesRepository {
  loadAll(): Promise<Node[]>;
  get(nodeNum: number): Promise<Node | undefined>;
  upsert(node: Node): Promise<void>;
  upsertBatch(nodes: ReadonlyArray<Node>): Promise<void>;
  remove(nodeNum: number): Promise<void>;
  clear(): Promise<void>;
  setScope?(scope: number): void;
}

export type TelemetryKind = Protobuf.Telemetry.Telemetry["variant"]["case"];

export interface TelemetryReading {
  readonly nodeNum: number;
  readonly time: Date;
  readonly kind: TelemetryKind;
  readonly value: Protobuf.Telemetry.Telemetry["variant"]["value"];
}

export interface TelemetryRetentionPolicy {
  maxPerNode?: number;
  olderThanMs?: number;
}

export interface TelemetryRepository {
  loadRecent(nodeNum: number, limit: number): Promise<TelemetryReading[]>;
  loadBefore(
    nodeNum: number,
    cursor: Date,
    limit: number,
  ): Promise<TelemetryReading[]>;
  append(reading: TelemetryReading): Promise<void>;
  appendBatch(readings: ReadonlyArray<TelemetryReading>): Promise<void>;
  prune(policy: TelemetryRetentionPolicy): Promise<void>;
  clearNode(nodeNum: number): Promise<void>;
  clear(): Promise<void>;
  setScope?(scope: number): void;
}

/**
 * The conversation a received message belongs to. Wrong for a direct
 * message we sent, which belongs to its recipient; callers that know the
 * local node pass the key instead.
 */
export function inferConversation(message: Message): ConversationKey {
  return message.type === "direct"
    ? { kind: "direct", peer: message.from }
    : { kind: "channel", channel: message.channel };
}

export function conversationKeyString(key: ConversationKey): string {
  return key.kind === "channel"
    ? `channel:${key.channel}`
    : `direct:${key.peer}`;
}

export function parseConversationKey(s: string): ConversationKey {
  if (s.startsWith("channel:"))
    return { kind: "channel", channel: Number(s.slice(8)) };
  if (s.startsWith("direct:"))
    return { kind: "direct", peer: Number(s.slice(7)) };
  throw new Error(`Unknown conversation key format: ${s}`);
}

export function base64Encode(bytes: Uint8Array): string {
  let s = "";
  for (const byte of bytes) s += String.fromCharCode(byte);
  return btoa(s);
}

export function base64Decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
