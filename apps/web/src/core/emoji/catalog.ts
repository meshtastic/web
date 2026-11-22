import { Result } from "better-result";
import { z } from "zod/v4";

/**
 * The emoji catalog behind the picker: categories of emoji with search
 * keywords and whether each takes a skin tone. The data file is
 * `public/emoji/emoji-data.json`, copied unchanged from the Meshtastic
 * Android app (meshtastic/Meshtastic-Android, GPL-3.0, commit b2c52cba8c,
 * core/ui/src/commonMain/composeResources/files/emoji-data.json): Unicode
 * 16.0 emoji with CLDR keywords. Both projects are GPL-3.0.
 */

export interface Emoji {
  readonly base: string;
  /** CLDR keywords, lower case, in alphabetical order. */
  readonly keywords: readonly string[];
  readonly supportsSkinTone: boolean;
}

export interface EmojiCategory {
  /** English name from the data file; see `categoryKey` for its label. */
  readonly name: string;
  /** Emoji shown on the category's tab. */
  readonly icon: string;
  readonly emojis: readonly Emoji[];
}

export interface EmojiCatalog {
  readonly version: string;
  readonly categories: readonly EmojiCategory[];
  readonly all: readonly Emoji[];
  /** Lookup by base emoji. */
  readonly byBase: ReadonlyMap<string, Emoji>;
}

const emojiDataSchema = z.object({
  version: z.string(),
  categories: z.array(
    z.object({
      name: z.string().min(1),
      icon: z.string().min(1),
      emojis: z.array(
        z.object({
          b: z.string().min(1),
          k: z.array(z.string()).default([]),
          s: z.boolean().default(false),
        }),
      ),
    }),
  ),
});

export class EmojiDataError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmojiDataError";
  }
}

/** Validates the data file's JSON into a catalog. */
export const parseEmojiData = (
  json: unknown,
): Result<EmojiCatalog, EmojiDataError> => {
  const parsed = emojiDataSchema.safeParse(json);
  if (!parsed.success) {
    return Result.err(
      new EmojiDataError("The emoji data is malformed", {
        cause: parsed.error,
      }),
    );
  }
  const categories: EmojiCategory[] = parsed.data.categories.map((c) => ({
    name: c.name,
    icon: c.icon,
    emojis: c.emojis.map((e) => ({
      base: e.b,
      keywords: e.k.map((k) => k.toLowerCase()),
      supportsSkinTone: e.s,
    })),
  }));
  const all = categories.flatMap((c) => c.emojis);
  return Result.ok({
    version: parsed.data.version,
    categories,
    all,
    byBase: new Map(all.map((e) => [e.base, e])),
  });
};

/** i18n key suffix (`emojiPicker.category…`) for each category in the data file. */
const CATEGORY_KEYS: Readonly<Record<string, string>> = {
  "Smileys & Emotion": "SmileysEmotion",
  "People & Body": "PeopleBody",
  "Animals & Nature": "AnimalsNature",
  "Food & Drink": "FoodDrink",
  "Travel & Places": "TravelPlaces",
  Activities: "Activities",
  Objects: "Objects",
  Symbols: "Symbols",
  Flags: "Flags",
};

/** The category's i18n key suffix, or undefined for a name we don't know. */
export const categoryKey = (name: string): string | undefined =>
  CATEGORY_KEYS[name];

/**
 * Fitzpatrick modifiers by index, the order the Android app stores the
 * preferred tone in: default, light, medium-light, medium, medium-dark,
 * dark.
 */
export const SKIN_TONE_MODIFIERS = [
  "",
  "\u{1F3FB}",
  "\u{1F3FC}",
  "\u{1F3FD}",
  "\u{1F3FE}",
  "\u{1F3FF}",
] as const;

export const SKIN_TONE_COUNT = SKIN_TONE_MODIFIERS.length;

/** A stored skin-tone index, or 0 (default) when it isn't a valid one. */
export const parseSkinToneIndex = (value: unknown): number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value < SKIN_TONE_COUNT
    ? value
    : 0;

/**
 * The emoji with a skin tone, the way the Android app builds it: the
 * modifier goes right after the first code point and the rest follows
 * unchanged (so ✌️ becomes U+270C U+1F3FB U+FE0F, and in a ZWJ sequence
 * only the first person is toned). Matching it byte for byte keeps toned
 * reactions from both apps grouping together. Unchanged for emoji without
 * skin tones and for the default tone.
 */
export const withSkinTone = (
  emoji: Pick<Emoji, "base" | "supportsSkinTone">,
  toneIndex: number,
): string => {
  const modifier = SKIN_TONE_MODIFIERS[parseSkinToneIndex(toneIndex)];
  if (!emoji.supportsSkinTone || modifier === "") {
    return emoji.base;
  }
  const first = emoji.base.codePointAt(0);
  if (first === undefined) {
    return emoji.base;
  }
  const firstLength = first > 0xffff ? 2 : 1;
  return (
    emoji.base.slice(0, firstLength) + modifier + emoji.base.slice(firstLength)
  );
};

/** The emoji with any skin-tone modifiers removed, for catalog lookup. */
export const stripSkinTone = (emoji: string): string =>
  emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");

/** How many keywords make an emoji's accessible name. */
const NAME_KEYWORDS = 3;

/**
 * A readable name for an emoji from its keywords. The data has no CLDR
 * names, only alphabetised keywords, so the first few stand in (😀 is
 * "cheerful, cheery, face"). Emoji not in the catalog are their own name;
 * screen readers speak them.
 */
export const emojiName = (catalog: EmojiCatalog, emoji: string): string => {
  const entry =
    catalog.byBase.get(emoji) ?? catalog.byBase.get(stripSkinTone(emoji));
  if (!entry || entry.keywords.length === 0) {
    return emoji;
  }
  return entry.keywords.slice(0, NAME_KEYWORDS).join(", ");
};

// Scores as the Android picker ranks search results: exact keyword, then
// prefix, then substring; a match in the emoji itself counts a little, and
// a recently used emoji that matches gets a boost.
const SCORE_EXACT = 10;
const SCORE_PREFIX = 4;
const SCORE_SUBSTRING = 1;
const SCORE_BASE_CONTAINS = 0.5;
const SCORE_RECENT_BOOST = 3;

const scoreEmoji = (
  emoji: Emoji,
  query: string,
  recent: ReadonlySet<string>,
): number => {
  let score = 0;
  for (const keyword of emoji.keywords) {
    if (keyword === query) {
      score += SCORE_EXACT;
    } else if (keyword.startsWith(query)) {
      score += SCORE_PREFIX;
    } else if (keyword.includes(query)) {
      score += SCORE_SUBSTRING;
    }
  }
  if (emoji.base.includes(query)) {
    score += SCORE_BASE_CONTAINS;
  }
  if (score > 0 && recent.has(emoji.base)) {
    score += SCORE_RECENT_BOOST;
  }
  return score;
};

/**
 * Emoji matching a search, best first: by keyword (exact, prefix or
 * substring, case-insensitive) or by the emoji itself. Empty for a blank
 * query. `recent` emoji that match rank higher.
 */
export const searchEmoji = (
  catalog: EmojiCatalog,
  query: string,
  recent: readonly string[] = [],
): Emoji[] => {
  const q = query.trim().toLowerCase();
  if (q === "") {
    return [];
  }
  const recentSet = new Set(recent.map(stripSkinTone));
  return catalog.all
    .map((emoji, index) => ({
      emoji,
      index,
      score: scoreEmoji(emoji, q, recentSet),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((s) => s.emoji);
};
