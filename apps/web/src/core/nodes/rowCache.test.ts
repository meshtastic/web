import { describe, expect, it } from "vitest";
import { reuseUnchangedRows, rowsEqual } from "./rowCache.ts";
import { makeRow } from "./testNodes.ts";

const a = () =>
  makeRow({
    num: 1,
    longName: "A",
    lat: 1,
    lng: 2,
    batteryLevel: 50,
    publicKey: new Uint8Array([1, 2]),
    heardSecondsAgo: 60,
  });
const b = () => makeRow({ num: 2, longName: "B" });

describe("rowsEqual", () => {
  it("compares positions, keys and battery by value", () => {
    expect(rowsEqual(a(), a())).toBe(true);
  });

  it("notices a changed field", () => {
    expect(rowsEqual(a(), { ...a(), snr: 3 })).toBe(false);
    expect(rowsEqual(a(), { ...a(), lngLat: [2, 2] })).toBe(false);
    expect(
      rowsEqual(a(), { ...a(), battery: { kind: "level", percent: 51 } }),
    ).toBe(false);
    expect(rowsEqual(a(), { ...a(), publicKey: new Uint8Array([1, 3]) })).toBe(
      false,
    );
  });
});

describe("reuseUnchangedRows", () => {
  it("keeps the previous objects for unchanged rows", () => {
    const prev = [a(), b()];
    const next = reuseUnchangedRows(prev, [a(), { ...b(), name: "B2" }]);
    expect(next[0]).toBe(prev[0]);
    expect(next[1]).not.toBe(prev[1]);
    expect(next[1]?.name).toBe("B2");
  });

  it("returns the previous array when nothing changed", () => {
    const prev = [a(), b()];
    expect(reuseUnchangedRows(prev, [a(), b()])).toBe(prev);
  });

  it("returns a new array when order or length changes", () => {
    const prev = [a(), b()];
    const reordered = reuseUnchangedRows(prev, [b(), a()]);
    expect(reordered).not.toBe(prev);
    expect(reordered[0]).toBe(prev[1]);
    expect(reuseUnchangedRows(prev, [a()])).not.toBe(prev);
  });
});
