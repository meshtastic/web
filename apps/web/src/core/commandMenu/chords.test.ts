import { describe, expect, it } from "vitest";
import {
  CHORD_TIMEOUT_MS,
  type ChordKeyInput,
  type ChordState,
  chordKeysFor,
  idleChord,
  nextChord,
} from "./chords.ts";

const key = (value: string, overrides: Partial<ChordKeyInput> = {}) => ({
  key: value,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  editable: false,
  blocked: false,
  ...overrides,
});

const press = (
  keys: ReadonlyArray<[ChordKeyInput, number]>,
  start: ChordState = idleChord,
) => {
  let state = start;
  let path: string | undefined;
  for (const [input, at] of keys) {
    const step = nextChord(state, input, at);
    state = step.state;
    path = step.path;
  }
  return { state, path };
};

describe("nextChord", () => {
  it("navigates on G then a destination key", () => {
    expect(
      press([
        [key("g"), 0],
        [key("m"), 300],
      ]).path,
    ).toBe("/map");
    expect(
      press([
        [key("g"), 0],
        [key("n"), 300],
      ]).path,
    ).toBe("/nodes");
    expect(
      press([
        [key("g"), 0],
        [key("c"), 300],
      ]).path,
    ).toBe("/messages");
    expect(
      press([
        [key("G"), 0],
        [key("S"), 300],
      ]).path,
    ).toBe("/settings");
  });

  it("returns to idle after a completed chord", () => {
    expect(
      press([
        [key("g"), 0],
        [key("m"), 300],
      ]).state,
    ).toEqual(idleChord);
  });

  it("times out", () => {
    expect(
      press([
        [key("g"), 0],
        [key("m"), CHORD_TIMEOUT_MS + 1],
      ]).path,
    ).toBeUndefined();
  });

  it("ignores the second key alone and unknown second keys", () => {
    expect(press([[key("m"), 0]]).path).toBeUndefined();
    const { state, path } = press([
      [key("g"), 0],
      [key("x"), 100],
    ]);
    expect(path).toBeUndefined();
    expect(state).toEqual(idleChord);
  });

  it("restarts on a repeated leader", () => {
    expect(
      press([
        [key("g"), 0],
        [key("g"), 900],
        [key("m"), 1800],
      ]).path,
    ).toBe("/map");
  });

  it("ignores modified keys, text fields and open dialogs", () => {
    expect(
      press([
        [key("g"), 0],
        [key("m", { metaKey: true }), 100],
      ]).path,
    ).toBeUndefined();
    expect(
      press([
        [key("g", { editable: true }), 0],
        [key("m"), 100],
      ]).path,
    ).toBeUndefined();
    expect(
      press([
        [key("g"), 0],
        [key("m", { editable: true }), 100],
      ]).path,
    ).toBeUndefined();
    expect(
      press([
        [key("g"), 0],
        [key("m", { blocked: true }), 100],
      ]).path,
    ).toBeUndefined();
    expect(
      press([
        [key("g", { ctrlKey: true }), 0],
        [key("m"), 100],
      ]).path,
    ).toBeUndefined();
  });
});

describe("chordKeysFor", () => {
  it("labels each destination's chord", () => {
    expect(chordKeysFor("/map")).toEqual(["G", "M"]);
    expect(chordKeysFor("/messages")).toEqual(["G", "C"]);
  });
});
