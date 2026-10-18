import { fromByteArray } from "base64-js";
import { describe, expect, it } from "vitest";
import { makeChannelSchema } from "./channel.ts";

function makeBase64OfLength(len: number): string {
  return fromByteArray(new Uint8Array(len));
}

describe("makeChannelSchema", () => {
  const allowedBytes = 16;
  const schema = makeChannelSchema(allowedBytes);

  const valid = {
    name: "TestName",
    psk: makeBase64OfLength(allowedBytes),
    uplinkEnabled: true,
    downlinkEnabled: false,
    positionPrecision: 10,
  };

  const issuePaths = (input: unknown) => {
    const result = schema.safeParse(input);
    return result.success ? [] : result.error.issues.map((i) => i.path[0]);
  };

  it("accepts the dialog's fields", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("does not require fields the dialog does not render", () => {
    // role, id, channelNum and useAead are copied from the existing channel.
    const result = schema.safeParse(valid);
    expect(result.success && Object.keys(result.data).sort()).toEqual([
      "downlinkEnabled",
      "name",
      "positionPrecision",
      "psk",
      "uplinkEnabled",
    ]);
  });

  it("rejects invalid base64 psk", () => {
    expect(issuePaths({ ...valid, psk: "not_base64!" })).toContain("psk");
  });

  it("rejects psk of the wrong length", () => {
    expect(issuePaths({ ...valid, psk: makeBase64OfLength(8) })).toContain(
      "psk",
    );
  });

  it("accepts an empty psk when 0 bytes are allowed", () => {
    expect(makeChannelSchema(0).safeParse({ ...valid, psk: "" }).success).toBe(
      true,
    );
  });

  it("accepts a name of 11 bytes and rejects 12", () => {
    expect(schema.safeParse({ ...valid, name: "a".repeat(11) }).success).toBe(
      true,
    );
    expect(issuePaths({ ...valid, name: "a".repeat(12) })).toContain("name");
  });

  it("counts bytes, not characters, in the name", () => {
    // "é" is 2 bytes in UTF-8: 6 of them are 12 bytes.
    expect(issuePaths({ ...valid, name: "é".repeat(6) })).toContain("name");
  });

  it("accepts positionPrecision 0, 10-19 or 32", () => {
    for (const val of [0, 10, 15, 19, 32]) {
      expect(
        schema.safeParse({ ...valid, positionPrecision: val }).success,
      ).toBe(true);
    }
  });

  it("rejects positionPrecision out of range", () => {
    for (const val of [9, 20, 31, 33]) {
      expect(
        schema.safeParse({ ...valid, positionPrecision: val }).success,
      ).toBe(false);
    }
  });
});
