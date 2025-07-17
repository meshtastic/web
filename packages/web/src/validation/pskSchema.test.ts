import { fromByteArray } from "base64-js";
import { describe, expect, it } from "vitest";
import { makePskHelpers } from "./pskSchema.ts";

function makeBase64OfLength(len: number): string {
  return fromByteArray(new Uint8Array(len));
}

describe("stringSchema", () => {
  it("accepts valid base64 string of allowed length", () => {
    const { stringSchema } = makePskHelpers([16]);
    const valid = makeBase64OfLength(16);
    expect(() => stringSchema().parse(valid)).not.toThrow();
  });

  it("rejects base64 string of disallowed length", () => {
    const { stringSchema, msgs } = makePskHelpers([16]);
    const invalid = makeBase64OfLength(8);
    const result = stringSchema().safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(msgs.length);
    }
  });

  it("rejects invalid base64 string", () => {
    const { stringSchema, msgs } = makePskHelpers([16]);
    const result = stringSchema().safeParse("not_base64!");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(msgs.format);
    }
  });

  it("rejects empty string if not optional and 0 not allowed", () => {
    const { stringSchema, msgs } = makePskHelpers([16]);
    const result = stringSchema().safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(msgs.required);
    }
  });

  it("accepts empty string if 0 is allowed", () => {
    const { stringSchema } = makePskHelpers([0]);
    const result = stringSchema().safeParse("");
    expect(result.success).toBe(true);
  });

  it("accepts empty string if optional=true", () => {
    const { stringSchema } = makePskHelpers([16]);
    const result = stringSchema(true).safeParse("");
    expect(result.success).toBe(true);
  });

  it("accepts all allowed lengths", () => {
    const { stringSchema } = makePskHelpers([8, 16, 32]);
    for (const len of [8, 16, 32]) {
      const valid = makeBase64OfLength(len);
      const result = stringSchema().safeParse(valid);
      expect(result.success).toBe(true);
    }
  });

  it("accepts valid base64 string as optional when optional=true", () => {
    const { stringSchema } = makePskHelpers([16]);
    const valid = makeBase64OfLength(16);
    const result = stringSchema(true).safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects base64 string with correct length but extra padding", () => {
    const { stringSchema, msgs } = makePskHelpers([16]);
    const valid = `${makeBase64OfLength(16)}==`;
    const result = stringSchema().safeParse(valid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(msgs.format);
    }
  });

  it("accepts empty string if allowedByteLengths includes 0 and optional=false", () => {
    const { stringSchema } = makePskHelpers([0, 16]);
    const result = stringSchema(false).safeParse("");
    expect(result.success).toBe(true);
  });

  it("rejects base64 string with valid format but not in allowedByteLengths", () => {
    const { stringSchema, msgs } = makePskHelpers([8, 32]);
    const invalid = makeBase64OfLength(16);
    const result = stringSchema().safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(msgs.length);
    }
  });

  describe("bytesSchema", () => {
    it("accepts valid byte array of allowed length", () => {
      const { bytesSchema } = makePskHelpers([16]);
      const valid = new Uint8Array(16);
      expect(() => bytesSchema().parse(valid)).not.toThrow();
    });

    it("rejects byte array of disallowed length", () => {
      const { bytesSchema, msgs } = makePskHelpers([16]);
      const invalid = new Uint8Array(8);
      const result = bytesSchema().safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(msgs.length);
      }
    });

    it("rejects non-Uint8Array input", () => {
      const { bytesSchema } = makePskHelpers([16]);
      const result = bytesSchema().safeParse([1, 2, 3]);
      expect(result.success).toBe(false);
    });

    it("rejects empty array if not optional and 0 not allowed", () => {
      const { bytesSchema, msgs } = makePskHelpers([16]);
      const result = bytesSchema().safeParse(new Uint8Array(0));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(msgs.required);
      }
    });

    it("accepts empty array if 0 is allowed", () => {
      const { bytesSchema } = makePskHelpers([0]);
      const result = bytesSchema().safeParse(new Uint8Array(0));
      expect(result.success).toBe(true);
    });

    it("accepts empty array if optional=true", () => {
      const { bytesSchema } = makePskHelpers([16]);
      const result = bytesSchema(true).safeParse(new Uint8Array(0));
      expect(result.success).toBe(true);
    });

    it("accepts all allowed lengths", () => {
      const { bytesSchema } = makePskHelpers([8, 16, 32]);
      for (const len of [8, 16, 32]) {
        const valid = new Uint8Array(len);
        const result = bytesSchema().safeParse(valid);
        expect(result.success).toBe(true);
      }
    });

    it("accepts valid byte array as optional when optional=true", () => {
      const { bytesSchema } = makePskHelpers([16]);
      const valid = new Uint8Array(16);
      const result = bytesSchema(true).safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("accepts empty array if allowedByteLengths includes 0 and optional=false", () => {
      const { bytesSchema } = makePskHelpers([0, 16]);
      const result = bytesSchema(false).safeParse(new Uint8Array(0));
      expect(result.success).toBe(true);
    });

    it("rejects byte array with valid format but not in allowedByteLengths", () => {
      const { bytesSchema, msgs } = makePskHelpers([8, 32]);
      const invalid = new Uint8Array(16);
      const result = bytesSchema().safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(msgs.length);
      }
    });
  });
});
