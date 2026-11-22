import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUICK_EMOJIS,
  mostUsedEmojis,
  parseEmojiFrequency,
  quickEmojis,
  recordEmojiUse,
} from "./frequency.ts";

describe("parseEmojiFrequency", () => {
  it("keeps valid entries in order", () => {
    expect(
      parseEmojiFrequency([
        { emoji: "🔥", count: 3 },
        { emoji: "👋🏽", count: 1 },
      ]),
    ).toEqual([
      { emoji: "🔥", count: 3 },
      { emoji: "👋🏽", count: 1 },
    ]);
  });

  it("drops malformed entries and repeats", () => {
    expect(
      parseEmojiFrequency([
        { emoji: "🔥", count: 3 },
        { emoji: "🔥", count: 9 },
        { emoji: "", count: 1 },
        { emoji: "😂", count: 0 },
        { emoji: "😮", count: 1.5 },
        { emoji: 4, count: 1 },
        null,
        "👍=2",
      ]),
    ).toEqual([{ emoji: "🔥", count: 3 }]);
    expect(parseEmojiFrequency("👍=2,🔥=1")).toEqual([]);
    expect(parseEmojiFrequency(undefined)).toEqual([]);
  });
});

describe("recordEmojiUse", () => {
  it("adds a new emoji at the end and counts repeats in place", () => {
    const once = recordEmojiUse([], "🔥");
    expect(once).toEqual([{ emoji: "🔥", count: 1 }]);
    const more = recordEmojiUse(recordEmojiUse(once, "😂"), "🔥");
    expect(more).toEqual([
      { emoji: "🔥", count: 2 },
      { emoji: "😂", count: 1 },
    ]);
  });

  it("counts toned variants separately, as sent", () => {
    expect(recordEmojiUse([{ emoji: "👋", count: 1 }], "👋🏽")).toEqual([
      { emoji: "👋", count: 1 },
      { emoji: "👋🏽", count: 1 },
    ]);
  });

  it("ignores an empty emoji and doesn't mutate its input", () => {
    const input = [{ emoji: "🔥", count: 1 }];
    expect(recordEmojiUse(input, "")).toEqual(input);
    recordEmojiUse(input, "🔥");
    expect(input).toEqual([{ emoji: "🔥", count: 1 }]);
  });
});

describe("mostUsedEmojis", () => {
  it("sorts by count, ties in first-use order, and takes the top N", () => {
    const frequency = [
      { emoji: "a", count: 1 },
      { emoji: "b", count: 5 },
      { emoji: "c", count: 2 },
      { emoji: "d", count: 5 },
      { emoji: "e", count: 2 },
    ];
    expect(mostUsedEmojis(frequency, 3)).toEqual(["b", "d", "c"]);
    expect(mostUsedEmojis(frequency, 0)).toEqual([]);
  });
});

describe("quickEmojis", () => {
  it("is Android's six defaults before anything is picked", () => {
    expect(quickEmojis([])).toEqual(["👍", "👎", "😂", "🔥", "❤️", "😮"]);
    expect(DEFAULT_QUICK_EMOJIS).toHaveLength(6);
  });

  it("puts the most used first and tops up from the defaults", () => {
    expect(
      quickEmojis([
        { emoji: "🔥", count: 1 },
        { emoji: "🎉", count: 4 },
      ]),
    ).toEqual(["🎉", "🔥", "👍", "👎", "😂", "❤️"]);
  });

  it("shows only used emoji once there are six or more", () => {
    const used = ["a", "b", "c", "d", "e", "f", "g"].map((emoji, i) => ({
      emoji,
      count: 10 - i,
    }));
    expect(quickEmojis(used)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});
