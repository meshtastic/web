import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  categoryKey,
  type EmojiCatalog,
  emojiName,
  parseEmojiData,
  parseSkinToneIndex,
  searchEmoji,
  stripSkinTone,
  withSkinTone,
} from "./catalog.ts";

const codePoints = (s: string) =>
  Array.from(s).map((c) => c.codePointAt(0)?.toString(16));

const sample = {
  version: "16.0",
  categories: [
    {
      name: "Smileys & Emotion",
      icon: "😀",
      emojis: [
        { b: "😀", k: ["cheerful", "face", "grin", "smile"] },
        { b: "😂", k: ["face", "joy", "laugh", "tears"] },
        { b: "🙂", k: ["Face", "Slightly", "Smile"] },
      ],
    },
    {
      name: "People & Body",
      icon: "👋",
      emojis: [
        { b: "👋", k: ["hand", "wave", "waving"], s: true },
        { b: "✌️", k: ["peace", "victory"], s: true },
        { b: "🧔‍♂️", k: ["beard", "man"], s: true },
        { b: "🫂" },
      ],
    },
  ],
};

const catalogOf = (json: unknown): EmojiCatalog => {
  const result = parseEmojiData(json);
  if (Result.isError(result)) {
    throw result.error;
  }
  return result.value;
};

describe("parseEmojiData", () => {
  it("reads categories, keywords and skin-tone support", () => {
    const catalog = catalogOf(sample);
    expect(catalog.version).toBe("16.0");
    expect(catalog.categories.map((c) => [c.name, c.icon])).toEqual([
      ["Smileys & Emotion", "😀"],
      ["People & Body", "👋"],
    ]);
    expect(catalog.all).toHaveLength(7);
    expect(catalog.byBase.get("👋")).toEqual({
      base: "👋",
      keywords: ["hand", "wave", "waving"],
      supportsSkinTone: true,
    });
    // Missing keywords and flag default; keywords are lower-cased.
    expect(catalog.byBase.get("🫂")).toEqual({
      base: "🫂",
      keywords: [],
      supportsSkinTone: false,
    });
    expect(catalog.byBase.get("🙂")?.keywords).toEqual([
      "face",
      "slightly",
      "smile",
    ]);
  });

  it("rejects malformed data", () => {
    expect(Result.isError(parseEmojiData(null))).toBe(true);
    expect(Result.isError(parseEmojiData({ categories: [] }))).toBe(true);
    expect(
      Result.isError(
        parseEmojiData({
          version: "1",
          categories: [{ name: "x", icon: "x", emojis: [{ b: "" }] }],
        }),
      ),
    ).toBe(true);
  });

  it("parses the shipped data file", () => {
    const path = join(
      import.meta.dirname,
      "../../../public/emoji/emoji-data.json",
    );
    const catalog = catalogOf(JSON.parse(readFileSync(path, "utf8")));
    expect(catalog.categories).toHaveLength(9);
    expect(catalog.all).toHaveLength(1870);
    expect(catalog.all.filter((e) => e.supportsSkinTone)).toHaveLength(305);
    for (const category of catalog.categories) {
      expect(categoryKey(category.name)).toBeDefined();
    }
  });
});

describe("withSkinTone", () => {
  const tone = (base: string, index: number, supportsSkinTone = true) =>
    withSkinTone({ base, supportsSkinTone }, index);

  it("puts the modifier after a surrogate-pair first code point", () => {
    expect(tone("👋", 1)).toBe("👋🏻");
    expect(codePoints(tone("👋", 5))).toEqual(["1f44b", "1f3ff"]);
  });

  it("puts it after a BMP first code point, keeping the FE0F (as Android)", () => {
    expect(codePoints(tone("✌️", 1))).toEqual(["270c", "1f3fb", "fe0f"]);
    expect(codePoints(tone("☝️", 3))).toEqual(["261d", "1f3fd", "fe0f"]);
  });

  it("tones only the first person of a ZWJ sequence", () => {
    expect(codePoints(tone("🧔‍♂️", 2))).toEqual([
      "1f9d4",
      "1f3fc",
      "200d",
      "2642",
      "fe0f",
    ]);
  });

  it("leaves the default tone and toneless emoji alone", () => {
    expect(tone("👋", 0)).toBe("👋");
    expect(tone("😀", 4, false)).toBe("😀");
    expect(tone("👋", 9)).toBe("👋");
  });

  it("strips a tone back off", () => {
    expect(stripSkinTone(tone("🧔‍♂️", 2))).toBe("🧔‍♂️");
    expect(stripSkinTone("👋🏿")).toBe("👋");
  });
});

describe("parseSkinToneIndex", () => {
  it("accepts 0 to 5 and defaults anything else", () => {
    expect(parseSkinToneIndex(5)).toBe(5);
    expect(parseSkinToneIndex(6)).toBe(0);
    expect(parseSkinToneIndex(-1)).toBe(0);
    expect(parseSkinToneIndex(1.5)).toBe(0);
    expect(parseSkinToneIndex("2")).toBe(0);
  });
});

describe("searchEmoji", () => {
  const catalog = catalogOf(sample);
  const bases = (query: string, recent?: string[]) =>
    searchEmoji(catalog, query, recent).map((e) => e.base);

  it("finds by keyword prefix and substring, case-insensitively", () => {
    expect(bases("WAV")).toEqual(["👋"]);
    expect(bases("ear")).toEqual(["😂", "🧔‍♂️"]);
  });

  it("ranks exact over prefix over substring", () => {
    // "smile": exact for 😀 and 🙂; "face" is a shared exact keyword.
    expect(bases("smile")).toEqual(["😀", "🙂"]);
    expect(bases("lau")).toEqual(["😂"]);
    expect(bases("face")).toEqual(["😀", "😂", "🙂"]);
  });

  it("boosts recently used matches", () => {
    expect(bases("face", ["🙂"])).toEqual(["🙂", "😀", "😂"]);
  });

  it("matches the emoji itself, and nothing for a blank query", () => {
    expect(bases("👋")).toEqual(["👋"]);
    expect(bases("   ")).toEqual([]);
    expect(bases("zzz")).toEqual([]);
  });
});

describe("emojiName", () => {
  const catalog = catalogOf(sample);

  it("names an emoji by its first keywords, also with a tone", () => {
    expect(emojiName(catalog, "😀")).toBe("cheerful, face, grin");
    expect(emojiName(catalog, "👋🏽")).toBe("hand, wave, waving");
  });

  it("falls back to the emoji itself", () => {
    expect(emojiName(catalog, "🫂")).toBe("🫂");
    expect(emojiName(catalog, "🦄")).toBe("🦄");
  });
});
