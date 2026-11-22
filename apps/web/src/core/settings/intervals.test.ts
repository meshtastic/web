import { describe, expect, it } from "vitest";
import {
  ALWAYS_ON_SECS,
  CAROUSEL_PRESETS,
  describeInterval,
  intervalChoices,
  SCREEN_ON_PRESETS,
} from "./intervals.ts";

describe("describeInterval", () => {
  it("names a value in its largest whole unit", () => {
    expect(describeInterval(15)).toEqual({
      kind: "count",
      unit: "seconds",
      count: 15,
    });
    expect(describeInterval(90)).toEqual({
      kind: "count",
      unit: "seconds",
      count: 90,
    });
    expect(describeInterval(300)).toEqual({
      kind: "count",
      unit: "minutes",
      count: 5,
    });
    expect(describeInterval(3600)).toEqual({
      kind: "count",
      unit: "hours",
      count: 1,
    });
  });

  it("names zero and always on", () => {
    expect(describeInterval(0)).toEqual({ kind: "zero" });
    expect(describeInterval(ALWAYS_ON_SECS)).toEqual({ kind: "alwaysOn" });
    expect(describeInterval(4_294_967_295)).toEqual({ kind: "alwaysOn" });
  });
});

describe("intervalChoices", () => {
  it("offers the presets when the current value is one of them", () => {
    expect(intervalChoices(SCREEN_ON_PRESETS, 60)).toEqual(SCREEN_ON_PRESETS);
    expect(intervalChoices(CAROUSEL_PRESETS, undefined)).toEqual(
      CAROUSEL_PRESETS,
    );
  });

  it("keeps a value set elsewhere, in order", () => {
    expect(intervalChoices(SCREEN_ON_PRESETS, 0)[0]).toBe(0);
    const choices = intervalChoices(SCREEN_ON_PRESETS, 90);
    expect(choices).toContain(90);
    expect(choices.indexOf(90)).toBe(choices.indexOf(60) + 1);
  });

  it("keeps an always-on value written as the largest uint32", () => {
    const choices = intervalChoices(SCREEN_ON_PRESETS, 4_294_967_295);
    expect(choices).toHaveLength(SCREEN_ON_PRESETS.length);
    expect(choices.at(-1)).toBe(4_294_967_295);
  });
});
