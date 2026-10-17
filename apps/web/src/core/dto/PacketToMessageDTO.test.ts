import type { Types } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import PacketToMessageDTO from "./PacketToMessageDTO.ts";

const packet: Types.PacketMetadata<string> = {
  id: 7,
  rxTime: new Date(1_700_000_000_000),
  type: "broadcast",
  from: 5,
  to: 0xffffffff,
  channel: 0 as Types.ChannelNumber,
  data: "hi",
};

describe("PacketToMessageDTO", () => {
  it("marks a message signed when the packet was XEdDSA signed", () => {
    const message = new PacketToMessageDTO(
      { ...packet, xeddsaSigned: true },
      1,
    ).toMessage();
    expect(message.signed).toBe(true);
  });

  it("leaves signed unset when the packet carries no signature info", () => {
    const message = new PacketToMessageDTO(packet, 1).toMessage();
    expect(message).not.toHaveProperty("signed");
  });
});
