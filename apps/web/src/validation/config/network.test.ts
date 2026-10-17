import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { hasUdpBroadcast, withUdpBroadcast } from "./network.ts";

const UDP = Protobuf.Config.Config_NetworkConfig_ProtocolFlags.UDP_BROADCAST;

describe("UDP broadcasting switch", () => {
  it("reads the UDP_BROADCAST bit", () => {
    expect(hasUdpBroadcast(undefined)).toBe(false);
    expect(hasUdpBroadcast(0)).toBe(false);
    expect(hasUdpBroadcast(UDP)).toBe(true);
    expect(hasUdpBroadcast(UDP | 0b100)).toBe(true);
  });

  it("sets and clears only that bit", () => {
    expect(withUdpBroadcast(0, true)).toBe(UDP);
    expect(withUdpBroadcast(undefined, true)).toBe(UDP);
    expect(withUdpBroadcast(UDP, false)).toBe(0);
    // Other protocol bits are kept.
    expect(withUdpBroadcast(0b100, true)).toBe(0b100 | UDP);
    expect(withUdpBroadcast(0b100 | UDP, false)).toBe(0b100);
  });
});
