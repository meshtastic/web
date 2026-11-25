import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_LENGTH, serializeLogArgs } from "./serialize.ts";

describe("serializeLogArgs", () => {
  it("joins strings and primitives with spaces", () => {
    expect(serializeLogArgs(["kmp:", "connect failed", 3, true, null])).toBe(
      "kmp: connect failed 3 true null",
    );
  });

  it("formats errors as name and message", () => {
    expect(serializeLogArgs([new TypeError("Failed to fetch")])).toBe(
      "TypeError: Failed to fetch",
    );
  });

  it("formats plain objects, including nested ones", () => {
    expect(
      serializeLogArgs([
        { id: 3217897557, name: "handshake-timeout", detail: { stage: 2 } },
      ]),
    ).toBe("{id: 3217897557, name: handshake-timeout, detail: {stage: 2}}");
  });

  it("replaces byte arrays with their size", () => {
    expect(serializeLogArgs([new Uint8Array(32), new ArrayBuffer(4)])).toBe(
      "<32 bytes> <4 bytes>",
    );
  });

  it("redacts keys, passwords and coordinates by field name", () => {
    const line = serializeLogArgs([
      {
        psk: "AQ==",
        privateKey: "x",
        public_key: "y",
        sessionPasskey: "z",
        latitudeI: 450000000,
        longitude: -75.7,
        snr: 6,
      },
    ]);
    expect(line).toBe(
      "{psk: [redacted], privateKey: [redacted], public_key: [redacted], sessionPasskey: [redacted], latitudeI: [redacted], longitude: [redacted], snr: 6}",
    );
  });

  it("marks circular references instead of looping", () => {
    const node: { name: string; self?: unknown } = { name: "a" };
    node.self = node;
    expect(serializeLogArgs([node])).toBe("{name: a, self: [circular]}");
  });

  it("stops at a fixed depth", () => {
    expect(serializeLogArgs([{ a: { b: { c: { d: 1 } } } }])).toBe(
      "{a: {b: {c: {…}}}}",
    );
  });

  it("shortens long arrays", () => {
    const line = serializeLogArgs([Array.from({ length: 25 }, (_, i) => i)]);
    expect(line.endsWith("19, …5 more]")).toBe(true);
  });

  it("caps the line length", () => {
    const line = serializeLogArgs(["x".repeat(MAX_MESSAGE_LENGTH + 50)]);
    expect(line).toHaveLength(MAX_MESSAGE_LENGTH + 1);
    expect(line.endsWith("…")).toBe(true);
  });
});
