import { describe, expect, it } from "vitest";
import { MessageMapper } from "../infrastructure/MessageMapper.ts";
import { MessageState } from "./MessageState.ts";
import { ChannelNumber } from "../../../core/types.ts";

describe("MessageMapper", () => {
  it("projects a text PacketMetadata into the Message domain shape", () => {
    const now = new Date(1_700_000_000_000);
    const message = MessageMapper.fromPacket(
      {
        id: 1,
        from: 10,
        to: 20,
        channel: ChannelNumber.Primary,
        rxTime: now,
        type: "direct",
        data: "hello",
      },
      MessageState.Pending,
    );
    expect(message).toEqual({
      id: 1,
      from: 10,
      to: 20,
      channel: ChannelNumber.Primary,
      rxTime: now,
      type: "direct",
      text: "hello",
      state: MessageState.Pending,
    });
  });
});
