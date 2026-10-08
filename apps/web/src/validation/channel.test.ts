import { fromByteArray } from "base64-js";
import { describe, expect, it } from "vitest";
import { makeChannelSchema } from "./channel.ts";

const mockRole = 0;

function makeBase64OfLength(len: number): string {
  return fromByteArray(new Uint8Array(len));
}

describe("makeChannelSchema", () => {
  const allowedBytes = 16;
  const schema = makeChannelSchema(allowedBytes);

  const validBase64 = makeBase64OfLength(allowedBytes);

  const validSettings = {
    channelNum: 3,
    psk: validBase64,
    name: "TestName",
    id: 3,
    uplinkEnabled: true,
    downlinkEnabled: false,
    moduleSettings: { positionPrecision: 10 },
  };

  it("accepts valid channel object", () => {
    const result = schema.safeParse({
      index: 0,
      settings: validSettings,
      role: mockRole,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid base64 psk", () => {
    const result = schema.safeParse({
      index: 0,
      settings: { ...validSettings, psk: "not_base64!" },
      role: mockRole,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path.includes("settings") && i.path.includes("psk"),
        ),
      ).toBe(true);
    }
  });

  it("rejects psk of wrong length", () => {
    const wrongLength = makeBase64OfLength(8);
    const result = schema.safeParse({
      index: 0,
      settings: { ...validSettings, psk: wrongLength },
      role: mockRole,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path.includes("settings") && i.path.includes("psk"),
        ),
      ).toBe(true);
    }
  });

  it("rejects name longer than 12 bytes", () => {
    const longName = "a".repeat(13);
    const result = schema.safeParse({
      index: 0,
      settings: { ...validSettings, name: longName },
      role: mockRole,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path.includes("settings") && i.path.includes("name"),
        ),
      ).toBe(true);
    }
  });

  // `ChannelSettings.channel_num` is a deprecated uint32 LoRa frequency slot,
  // not the 0-7 channel index. The form never renders it, so rejecting a real
  // device value here made the whole channel form invalid — and an invalid
  // form auto-saves nothing, with no error shown anywhere.
  it("accepts any uint32 channelNum the device reports", () => {
    for (const channelNum of [0, 8, 20, 104, 0xff_ff_ff_ff]) {
      const result = schema.safeParse({
        index: 0,
        settings: { ...validSettings, channelNum },
        role: mockRole,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a negative channelNum", () => {
    const result = schema.safeParse({
      index: 0,
      settings: { ...validSettings, channelNum: -1 },
      role: mockRole,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path.includes("settings") && i.path.includes("channelNum"),
        ),
      ).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    const result = schema.safeParse({
      index: 0,
      settings: {},
      role: mockRole,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("accepts moduleSettings.positionPrecision as 0, 10-19, or 32", () => {
    for (const val of [0, 10, 15, 19, 32]) {
      const result = schema.safeParse({
        index: 0,
        settings: {
          ...validSettings,
          moduleSettings: { positionPrecision: val },
        },
        role: mockRole,
      });
      expect(result.success).toBe(true);
    }
  });

  // The dropdown only offers 0 / 10-19 / 32, but the firmware stores any bit
  // count in 0-32. Rejecting an in-range value the device already holds would
  // block every save on the channel, so only genuinely impossible values fail.
  it("accepts any positionPrecision the firmware can store", () => {
    for (const val of [9, 20, 31]) {
      const result = schema.safeParse({
        index: 0,
        settings: {
          ...validSettings,
          moduleSettings: { positionPrecision: val },
        },
        role: mockRole,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects moduleSettings.positionPrecision out of range", () => {
    for (const val of [-1, 33, 64]) {
      const result = schema.safeParse({
        index: 0,
        settings: {
          ...validSettings,
          moduleSettings: { positionPrecision: val },
        },
        role: mockRole,
      });
      expect(result.success).toBe(false);
    }
  });

  it("round-trips moduleSettings.isMuted instead of dropping it", () => {
    const result = schema.safeParse({
      index: 0,
      settings: {
        ...validSettings,
        moduleSettings: { positionPrecision: 10, isMuted: true },
      },
      role: mockRole,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings.moduleSettings.isMuted).toBe(true);
    }
  });
});
