import { describe, expect, it } from "vitest";
import {
  charLength,
  evaluateTextLimit,
  measureText,
  utf8ByteLength,
} from "./textLimit.ts";

describe("utf8ByteLength", () => {
  it.each([
    ["", 0],
    ["abc", 3],
    ["é", 2],
    ["€", 3],
    ["👋", 4],
    ["naïve 👋", 11],
  ])("%j is %i bytes", (text, bytes) => {
    expect(utf8ByteLength(text)).toBe(bytes);
  });
});

describe("multi-code-point emoji", () => {
  it.each([
    // Regional indicators U+1F1E8 U+1F1E6: 2 code points, 8 bytes.
    ["🇨🇦", 8, 2],
    // Family: man ZWJ woman ZWJ girl = 5 code points, 18 bytes.
    ["👨‍👩‍👧", 18, 5],
    // Heart + VS16: 2 code points, 6 bytes.
    ["❤️", 6, 2],
  ])("%j is %i bytes and %i code points", (text, bytes, points) => {
    expect(utf8ByteLength(text)).toBe(bytes);
    expect(charLength(text)).toBe(points);
  });

  it("a flag overflows a 4-byte short name; one emoji fits", () => {
    expect(evaluateTextLimit("🇨🇦", { max: 4, mode: "bytes" }).over).toBe(true);
    expect(evaluateTextLimit("📡", { max: 4, mode: "bytes" }).over).toBe(false);
  });
});

describe("charLength", () => {
  it("counts code points, not UTF-16 units", () => {
    expect("👋".length).toBe(2);
    expect(charLength("👋")).toBe(1);
    expect(charLength("EAO1")).toBe(4);
    expect(charLength("")).toBe(0);
  });
});

describe("measureText", () => {
  it("switches on mode", () => {
    expect(measureText("é", "bytes")).toBe(2);
    expect(measureText("é", "chars")).toBe(1);
  });
});

describe("evaluateTextLimit", () => {
  it("is within the limit at exactly max", () => {
    expect(evaluateTextLimit("abcd", { max: 4, mode: "chars" })).toEqual({
      used: 4,
      limit: 4,
      remaining: 0,
      over: false,
    });
  });

  it("is over once past max", () => {
    const state = evaluateTextLimit("abcde", { max: 4, mode: "chars" });
    expect(state.over).toBe(true);
    expect(state.remaining).toBe(-1);
  });

  it("counts multi-byte text against a byte limit", () => {
    // 3 characters but 12 bytes.
    const state = evaluateTextLimit("👋👋👋", { max: 10, mode: "bytes" });
    expect(state).toMatchObject({ used: 12, over: true });
    expect(evaluateTextLimit("👋👋👋", { max: 10, mode: "chars" }).over).toBe(
      false,
    );
  });

  it("handles empty text", () => {
    expect(evaluateTextLimit("", { max: 200, mode: "bytes" })).toMatchObject({
      used: 0,
      remaining: 200,
      over: false,
    });
  });
});
