import { describe, expect, it } from "vitest";
import { dotPaths } from "./dotPath.ts";

describe("dotPaths", () => {
  it("returns flat keys for a simple object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(dotPaths(obj)).toEqual(["a", "b", "c"]);
  });

  it("returns dot notation keys for nested objects", () => {
    const obj = { a: { b: { c: 1 } }, d: 2 };
    expect(dotPaths(obj)).toEqual(["a.b.c", "d"]);
  });

  it("handles arrays at the root", () => {
    const arr = [{ x: 1 }, { y: 2 }];
    expect(dotPaths(arr)).toEqual(["0.x", "1.y"]);
  });

  it("handles arrays nested in objects", () => {
    const obj = { a: [{ b: 1 }, { c: 2 }], d: 3 };
    expect(dotPaths(obj)).toEqual(["a.0.b", "a.1.c", "d"]);
  });

  it("handles objects nested in arrays", () => {
    const arr = [{ a: { b: 1 } }, { c: 2 }];
    expect(dotPaths(arr)).toEqual(["0.a.b", "1.c"]);
  });

  it("handles primitive values in arrays", () => {
    const arr = [1, { a: 2 }, 3];
    expect(dotPaths(arr)).toEqual(["0", "1.a", "2"]);
  });

  it("handles empty objects and arrays", () => {
    expect(dotPaths({})).toEqual([]);
    expect(dotPaths([])).toEqual([]);
  });

  it("handles mixed nested structures", () => {
    const obj = {
      a: [{ b: 1, c: [2, 3] }, { d: { e: 4 } }],
      f: 5,
    };
    expect(dotPaths(obj)).toEqual([
      "a.0.b",
      "a.0.c.0",
      "a.0.c.1",
      "a.1.d.e",
      "f",
    ]);
  });

  it("handles prefix argument", () => {
    const obj = { a: { b: 1 } };
    expect(dotPaths(obj, "root.")).toEqual(["root.a.b"]);
  });

  it("skips null and undefined values", () => {
    const obj = { a: null, b: undefined, c: { d: 1 } };
    expect(dotPaths(obj)).toEqual(["a", "b", "c.d"]);
  });
});
