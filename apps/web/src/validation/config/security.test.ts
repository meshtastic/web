import { fromByteArray } from "base64-js";
import { describe, expect, it } from "vitest";
import { ParsedSecuritySchema, RawSecuritySchema } from "./security.ts";

function makeBase64OfLength(len: number): string {
  return fromByteArray(new Uint8Array(len));
}

describe("RawSecuritySchema", () => {
  const validKey = makeBase64OfLength(32);

  it("accepts valid security config", () => {
    const result = RawSecuritySchema.safeParse({
      isManaged: false,
      adminChannelEnabled: true,
      debugLogApiEnabled: false,
      serialEnabled: true,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: [validKey, "", ""],
    });
    expect(result.success).toBe(true);
  });

  it("rejects if privateKey is invalid", () => {
    const result = RawSecuritySchema.safeParse({
      isManaged: false,
      adminChannelEnabled: true,
      debugLogApiEnabled: false,
      serialEnabled: true,
      privateKey: "badkey",
      publicKey: validKey,
      adminKey: [validKey, "", ""],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("privateKey")),
      ).toBe(true);
    }
  });

  it("requires at least one adminKey if isManaged", () => {
    const result = RawSecuritySchema.safeParse({
      isManaged: true,
      adminChannelEnabled: true,
      debugLogApiEnabled: false,
      serialEnabled: true,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: ["", "", ""],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "formValidation.required.managed",
        ),
      ).toBe(true);
    }
  });

  it("accepts if at least one adminKey is valid when isManaged", () => {
    const result = RawSecuritySchema.safeParse({
      isManaged: true,
      adminChannelEnabled: true,
      debugLogApiEnabled: false,
      serialEnabled: true,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: [validKey, "", ""],
    });
    expect(result.success).toBe(true);
  });
});

describe("ParsedSecuritySchema", () => {
  const validKey = new Uint8Array(32);

  it("accepts valid parsed security config", () => {
    const result = ParsedSecuritySchema.safeParse({
      isManaged: false,
      adminChannelEnabled: true,
      debugLogApiEnabled: false,
      serialEnabled: true,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: [validKey, new Uint8Array(), new Uint8Array()],
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one adminKey if isManaged", () => {
    const result = ParsedSecuritySchema.safeParse({
      isManaged: true,
      adminChannelEnabled: true,
      debugLogApiEnabled: false,
      serialEnabled: true,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: [new Uint8Array(), new Uint8Array(), new Uint8Array()],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.message === "formValidation.required.managed",
        ),
      ).toBe(true);
    }
  });
});
