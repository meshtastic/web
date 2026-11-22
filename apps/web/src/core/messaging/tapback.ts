import { create, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { reactionKey } from "./reactions.ts";

/**
 * Tapback wire format, matching the Android app so reactions interoperate.
 *
 * Verified against Meshtastic-Android at commit b2c52cba
 * (MessagingControllerImpl.sendReaction):
 * https://github.com/meshtastic/Meshtastic-Android/blob/b2c52cba8ca3ff23ed6411db66a2608176a06267/core/service/src/commonMain/kotlin/org/meshtastic/core/service/MessagingControllerImpl.kt#L73-L94
 * and the receive-side check (DataPacketPersistence.kt, `Data.isReaction()`:
 * `portnum == TEXT_MESSAGE_APP && reply_id != 0 && emoji != 0`).
 * The Kotlin SDK's own `RadioClient.sendReaction` builds the same packet.
 *
 * - portnum TEXT_MESSAGE_APP, payload = the emoji as UTF-8 text
 * - Data.reply_id = packet id of the message reacted to
 * - Data.emoji = 1: a flag ("this text is a reaction"), not the codepoint
 * - MeshPacket.want_ack = true, to/channel of the conversation (the peer for
 *   a direct message, broadcast on the channel otherwise)
 *
 * There is no packet that withdraws a reaction. Android only deletes
 * reactions locally (alongside the message they belong to), so toggling my
 * own reaction off is local-only here too: other nodes keep showing it.
 */
export const REACTION_EMOJI_FLAG = 1;

/** Data.payload limit the SDK enforces (DATA_PAYLOAD_LEN). */
export const MAX_PAYLOAD_BYTES = 233;

export interface ReactionPacketInput {
  readonly emoji: string;
  /** Packet id of the message reacted to. */
  readonly targetId: number;
  /** Peer node number, or 0xffffffff for a channel. */
  readonly to: number;
  readonly channel: number;
}

/** The MeshPacket for a reaction; the SDK assigns `id` and `from`. */
export const buildReactionPacket = (
  input: ReactionPacketInput,
): Protobuf.Mesh.MeshPacket =>
  create(Protobuf.Mesh.MeshPacketSchema, {
    to: input.to,
    channel: input.channel,
    wantAck: true,
    payloadVariant: {
      case: "decoded",
      value: create(Protobuf.Mesh.DataSchema, {
        portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
        payload: new TextEncoder().encode(input.emoji),
        replyId: input.targetId,
        emoji: REACTION_EMOJI_FLAG,
      }),
    },
  });

/** `buildReactionPacket`, encoded for the SDK's `sendPacket`. */
export const encodeReactionPacket = (input: ReactionPacketInput): Uint8Array =>
  toBinary(Protobuf.Mesh.MeshPacketSchema, buildReactionPacket(input));

export type ReactionEmojiError = "empty" | "tooLong";

/**
 * The emoji to send, trimmed, or why it can't be: empty (whitespace or a
 * lone variation selector) or longer than one packet payload.
 */
export const validateReactionEmoji = (
  emoji: string,
):
  | { readonly ok: true; readonly emoji: string }
  | { readonly ok: false; readonly error: ReactionEmojiError } => {
  const trimmed = emoji.trim();
  if (reactionKey(trimmed).length === 0) {
    return { ok: false, error: "empty" };
  }
  if (new TextEncoder().encode(trimmed).length > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: "tooLong" };
  }
  return { ok: true, emoji: trimmed };
};

/** What an inbound TEXT_MESSAGE_APP packet carries. */
export type InboundText =
  | { readonly kind: "text"; readonly text: string; readonly replyId?: number }
  | {
      readonly kind: "reaction";
      readonly emoji: string;
      readonly targetId: number;
    };

/**
 * Tells a reaction from a text: like Android, any non-zero `emoji` with a
 * non-zero `reply_id` is a reaction to `reply_id` whose text is the emoji.
 * An `emoji` flag without a target is shown as ordinary text.
 */
export const classifyInboundText = (
  text: string,
  replyId: number | undefined,
  emoji: number | undefined,
): InboundText => {
  if (replyId && emoji) {
    return { kind: "reaction", emoji: text, targetId: replyId };
  }
  return replyId ? { kind: "text", text, replyId } : { kind: "text", text };
};
