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

  it("rejects channelNum out of range", () => {
    const result = schema.safeParse({
      index: 0,
      settings: { ...validSettings, channelNum: 10 },
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

  it("rejects moduleSettings.positionPrecision out of range", () => {
    for (const val of [9, 20, 31, 33]) {
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
});
