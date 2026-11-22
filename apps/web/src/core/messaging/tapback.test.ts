import { fromBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import {
  classifyInboundText,
  encodeReactionPacket,
  MAX_PAYLOAD_BYTES,
  REACTION_EMOJI_FLAG,
  validateReactionEmoji,
} from "./tapback.ts";

describe("encodeReactionPacket", () => {
  it("encodes a tapback the way the Android app does", () => {
    const bytes = encodeReactionPacket({
      emoji: "👍",
      targetId: 0x1234abcd,
      to: 0x11223344,
      channel: 2,
    });
    const packet = fromBinary(Protobuf.Mesh.MeshPacketSchema, bytes);
    expect(packet.to).toBe(0x11223344);
    expect(packet.channel).toBe(2);
    expect(packet.wantAck).toBe(true);
    expect(packet.id).toBe(0);
    expect(packet.payloadVariant.case).toBe("decoded");
    if (packet.payloadVariant.case !== "decoded") {
      throw new Error("expected a decoded payload");
    }
    const data = packet.payloadVariant.value;
    expect(data.portnum).toBe(Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP);
    expect(new TextDecoder().decode(data.payload)).toBe("👍");
    expect(data.replyId).toBe(0x1234abcd);
    expect(data.emoji).toBe(REACTION_EMOJI_FLAG);
    expect(REACTION_EMOJI_FLAG).toBe(1);
  });
});

describe("classifyInboundText", () => {
  it("reads emoji + reply_id as a reaction to reply_id", () => {
    expect(classifyInboundText("❤️", 42, 1)).toEqual({
      kind: "reaction",
      emoji: "❤️",
      targetId: 42,
    });
  });

  it("accepts any non-zero emoji value, like Android", () => {
    expect(classifyInboundText("😂", 42, 0x1f602).kind).toBe("reaction");
  });

  it("reads reply_id alone as a reply", () => {
    expect(classifyInboundText("yes", 42, undefined)).toEqual({
      kind: "text",
      text: "yes",
      replyId: 42,
    });
  });

  it("reads plain text, and an emoji flag without a target, as text", () => {
    expect(classifyInboundText("hi", undefined, undefined)).toEqual({
      kind: "text",
      text: "hi",
    });
    expect(classifyInboundText("👍", undefined, 1)).toEqual({
      kind: "text",
      text: "👍",
    });
  });
});

describe("validateReactionEmoji", () => {
  it("trims the emoji", () => {
    expect(validateReactionEmoji(" 👍 ")).toEqual({ ok: true, emoji: "👍" });
  });

  it("rejects empty input and a lone variation selector", () => {
    expect(validateReactionEmoji("  ")).toEqual({ ok: false, error: "empty" });
    expect(validateReactionEmoji("️")).toEqual({
      ok: false,
      error: "empty",
    });
  });

  it("rejects more than one payload of bytes", () => {
    expect(validateReactionEmoji("a".repeat(MAX_PAYLOAD_BYTES + 1))).toEqual({
      ok: false,
      error: "tooLong",
    });
  });
});
