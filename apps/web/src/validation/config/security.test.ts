import { Protobuf } from "@meshtastic/sdk";
import { fromByteArray } from "base64-js";
import { describe, expect, it } from "vitest";
import { ParsedSecuritySchema, RawSecuritySchema } from "./security.ts";

const Policy = Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy;
const COMPATIBLE = Policy.COMPATIBLE;

function makeBase64OfLength(len: number): string {
  return fromByteArray(new Uint8Array(len));
}

describe("RawSecuritySchema", () => {
  const validKey = makeBase64OfLength(32);

  it("accepts valid security config", () => {
    const result = RawSecuritySchema.safeParse({
      isManaged: false,
      debugLogApiEnabled: false,
      serialEnabled: true,
      packetSignaturePolicy: COMPATIBLE,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: [validKey, "", ""],
    });
    expect(result.success).toBe(true);
  });

  it("rejects if privateKey is invalid", () => {
    const result = RawSecuritySchema.safeParse({
      isManaged: false,
      debugLogApiEnabled: false,
      serialEnabled: true,
      packetSignaturePolicy: COMPATIBLE,
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
      debugLogApiEnabled: false,
      serialEnabled: true,
      packetSignaturePolicy: COMPATIBLE,
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
      debugLogApiEnabled: false,
      serialEnabled: true,
      packetSignaturePolicy: COMPATIBLE,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: [validKey, "", ""],
    });
    expect(result.success).toBe(true);
  });
});

describe("adminChannelEnabled", () => {
  it("is not part of the form, so a save keeps the device's value", () => {
    const validKey = makeBase64OfLength(32);
    const result = RawSecuritySchema.safeParse({
      isManaged: false,
      adminChannelEnabled: true,
      debugLogApiEnabled: false,
      serialEnabled: true,
      packetSignaturePolicy: COMPATIBLE,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: [validKey, "", ""],
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("adminChannelEnabled");
  });
});

describe("packetSignaturePolicy", () => {
  const base = {
    isManaged: false,
    debugLogApiEnabled: false,
    serialEnabled: true,
    privateKey: makeBase64OfLength(32),
    publicKey: makeBase64OfLength(32),
    adminKey: ["", "", ""],
  };

  it.each([Policy.COMPATIBLE, Policy.BALANCED, Policy.STRICT])(
    "accepts policy %s",
    (packetSignaturePolicy) => {
      const result = RawSecuritySchema.safeParse({
        ...base,
        packetSignaturePolicy,
      });
      expect(result.success).toBe(true);
    },
  );

  it("rejects an unknown policy", () => {
    const result = RawSecuritySchema.safeParse({
      ...base,
      packetSignaturePolicy: 99,
    });
    expect(result.success).toBe(false);
  });
});

describe("ParsedSecuritySchema", () => {
  const validKey = new Uint8Array(32);

  it("accepts valid parsed security config", () => {
    const result = ParsedSecuritySchema.safeParse({
      isManaged: false,
      debugLogApiEnabled: false,
      serialEnabled: true,
      packetSignaturePolicy: COMPATIBLE,
      privateKey: validKey,
      publicKey: validKey,
      adminKey: [validKey, new Uint8Array(), new Uint8Array()],
    });
    expect(result.success).toBe(true);
  });

  it("requires at least one adminKey if isManaged", () => {
    const result = ParsedSecuritySchema.safeParse({
      isManaged: true,
      debugLogApiEnabled: false,
      serialEnabled: true,
      packetSignaturePolicy: COMPATIBLE,
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
