import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import {
  keyKindOf,
  PRECISION_CHOICES,
  pskForKind,
  regeneratedPsk,
  slotRole,
  slotSummaries,
  withMuted,
} from "./channelSlots.ts";

const Role = Protobuf.Channel.Channel_Role;

const channel = (
  index: number,
  role: Protobuf.Channel.Channel_Role,
  name = "",
  psk = new Uint8Array(0),
) =>
  create(Protobuf.Channel.ChannelSchema, {
    index,
    role,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, { name, psk }),
  });

describe("keyKindOf", () => {
  it("names the Encryption choice by key length", () => {
    expect(keyKindOf("")).toBe("none");
    expect(keyKindOf("AQ==")).toBe("default");
    expect(keyKindOf(btoa("x".repeat(16)))).toBe("aes128");
    expect(keyKindOf(btoa("x".repeat(32)))).toBe("aes256");
  });

  it("is undefined for other lengths and bad base64", () => {
    expect(keyKindOf(btoa("xyz"))).toBeUndefined();
    expect(keyKindOf("not base64!")).toBeUndefined();
  });
});

describe("pskForKind", () => {
  const random = (bytes: number) => `r${bytes}`;
  it("gives a fixed key for none and default, random bytes for AES", () => {
    expect(pskForKind("none", random)).toBe("");
    expect(pskForKind("default", random)).toBe("AQ==");
    expect(pskForKind("aes128", random)).toBe("r16");
    expect(pskForKind("aes256", random)).toBe("r32");
  });

  it("regenerates at the key's length, AES-256 for short keys", () => {
    expect(regeneratedPsk(btoa("x".repeat(16)), random)).toBe("r16");
    expect(regeneratedPsk("AQ==", random)).toBe("r32");
    expect(regeneratedPsk("", random)).toBe("r32");
  });

  it("generates real keys of the right length by default", () => {
    expect(keyKindOf(pskForKind("aes128"))).toBe("aes128");
  });
});

describe("slotSummaries", () => {
  it("lists all eight slots, empty ones disabled", () => {
    const slots = slotSummaries(
      new Map([
        [0, channel(0, Role.PRIMARY, "", new Uint8Array([1]))],
        [1, channel(1, Role.SECONDARY, " Hike ", new Uint8Array(32))],
        [2, channel(2, Role.DISABLED, "old")],
      ]),
    );
    expect(slots).toHaveLength(8);
    expect(slots[0]).toEqual({
      index: 0,
      role: "primary",
      name: undefined,
      keyKind: "default",
    });
    expect(slots[1]).toEqual({
      index: 1,
      role: "secondary",
      name: "Hike",
      keyKind: "aes256",
    });
    expect(slots[2]?.role).toBe("disabled");
    expect(slots[2]?.name).toBeUndefined();
    expect(slots[7]?.role).toBe("disabled");
  });

  it("treats slot 0 as primary and missing slots as disabled", () => {
    expect(slotRole(channel(0, Role.SECONDARY))).toBe("primary");
    expect(slotRole(undefined)).toBe("disabled");
  });
});

describe("PRECISION_CHOICES", () => {
  it("offers off, 10 to 19 and precise", () => {
    expect(PRECISION_CHOICES).toEqual([
      0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 32,
    ]);
  });
});

describe("withMuted", () => {
  it("returns the same channel when the flag is unchanged", () => {
    const c = channel(1, Role.SECONDARY);
    expect(withMuted(c, false)).toBe(c);
  });

  it("sets the flag and keeps the rest of the settings", () => {
    const c = channel(1, Role.SECONDARY, "Hike", new Uint8Array(16));
    const muted = withMuted(c, true);
    expect(muted.settings?.moduleSettings?.isMuted).toBe(true);
    expect(muted.settings?.name).toBe("Hike");
    expect(muted.settings?.psk).toEqual(new Uint8Array(16));
  });
});
