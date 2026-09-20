import { describe, expect, it } from "vitest";
import { normalizeNumberInput } from "./FormInput.tsx";

describe("normalizeNumberInput", () => {
  it.each([
    ["", ""],
    ["-", "-"],
    ["34.", "34."],
    ["-34.", "-34."],
  ])("preserves intermediate value %j while typing", (input, expected) => {
    expect(normalizeNumberInput(input)).toBe(expected);
  });

  it.each([
    ["-34.1147648", "-34.1147648"],
    ["34.1147648", "34.1147648"],
    ["0", "0"],
    ["-180", "-180"],
    ["1e5", "100000"],
  ])("normalizes complete number %j to %j", (input, expected) => {
    expect(normalizeNumberInput(input)).toBe(expected);
  });

  it.each([["1e"], ["1e-"], ["12abc"], ["1.2.3"], ["Infinity"], ["-Infinity"]])(
    "keeps invalid text %j instead of truncating it",
    (input) => {
      expect(normalizeNumberInput(input)).toBe(input);
    },
  );
});
