import { describe, expect, it } from "vitest";
import {
  indexCommand,
  isCommandKind,
  isSearching,
  isSubsequence,
  LABEL_SCORES,
  parseQuery,
  SECONDARY_SCORES,
  scoreCommand,
} from "./search.ts";
import type { Command } from "./types.ts";

const nav = (
  label: string,
  extra: { hint?: string; keywords?: string[] } = {},
): Command => ({
  kind: "navigate",
  id: `nav:${label}`,
  group: "navigation",
  label,
  icon: "map",
  target: { to: "/map" },
  ...extra,
});

const node: Command = {
  kind: "node",
  id: "node:1",
  group: "nodes",
  label: "SovereignNet: Big Hill",
  hint: "1 hop · 3 minutes ago",
  keywords: ["SNBH", "!0000abcd"],
  nodeNum: 1,
  initials: "SNBH",
};

describe("parseQuery", () => {
  it("splits and normalises terms", () => {
    expect(parseQuery("  Big  HÏLL ")).toEqual({
      terms: ["big", "hill"],
      commandsOnly: false,
    });
  });

  it("treats a leading > as commands-only mode", () => {
    expect(parseQuery("> lora")).toEqual({
      terms: ["lora"],
      commandsOnly: true,
    });
    expect(parseQuery(">")).toEqual({ terms: [], commandsOnly: true });
  });

  it("only honours > at the start", () => {
    expect(parseQuery("a > b").commandsOnly).toBe(false);
  });

  it("reports whether anything was typed", () => {
    expect(isSearching(parseQuery("   "))).toBe(false);
    expect(isSearching(parseQuery(">"))).toBe(false);
    expect(isSearching(parseQuery("x"))).toBe(true);
  });
});

describe("isSubsequence", () => {
  it("matches characters in order", () => {
    expect(isSubsequence("lra", "lora")).toBe(true);
    expect(isSubsequence("arl", "lora")).toBe(false);
    expect(isSubsequence("", "lora")).toBe(true);
  });

  it("walks code points, not UTF-16 units", () => {
    expect(isSubsequence("📡a", "x📡ya")).toBe(true);
    expect(isSubsequence("📡📡", "📡")).toBe(false);
  });
});

describe("isCommandKind", () => {
  it("is true for navigation and actions only", () => {
    expect(isCommandKind(nav("Map"))).toBe(true);
    expect(isCommandKind(node)).toBe(false);
  });
});

describe("scoreCommand", () => {
  it("ranks exact > prefix > word prefix > substring > fuzzy", () => {
    const scores = [
      scoreCommand(nav("map"), ["map"]),
      scoreCommand(nav("mapping"), ["map"]),
      scoreCommand(nav("open map"), ["map"]),
      scoreCommand(nav("bitmap"), ["map"]),
      scoreCommand(nav("my area plan"), ["map"]),
    ];
    expect(scores).toEqual([
      LABEL_SCORES.exact,
      LABEL_SCORES.prefix,
      LABEL_SCORES.wordPrefix,
      LABEL_SCORES.substring,
      LABEL_SCORES.subsequence,
    ]);
  });

  it("does not fuzzy-match short terms", () => {
    expect(scoreCommand(nav("my area plan"), ["mp"])).toBe(0);
  });

  it("matches hints and keywords below label matches", () => {
    expect(scoreCommand(node, ["snbh"])).toBe(SECONDARY_SCORES.prefix);
    expect(scoreCommand(node, ["abcd"])).toBe(SECONDARY_SCORES.substring);
    // Node hints change with live data and are not matched.
    expect(scoreCommand(node, ["hop"])).toBe(0);
    expect(scoreCommand(node, ["big"])).toBe(LABEL_SCORES.wordPrefix);
  });

  it("requires every term to match and sums the scores", () => {
    expect(scoreCommand(node, ["big", "hill"])).toBe(
      LABEL_SCORES.wordPrefix * 2,
    );
    expect(scoreCommand(node, ["big", "valley"])).toBe(0);
  });

  it("matches hints of navigation and action rows", () => {
    expect(
      scoreCommand(nav("LoRa", { hint: "Region, preset" }), ["preset"]),
    ).toBe(SECONDARY_SCORES.wordPrefix);
  });

  it("ignores case and accents", () => {
    expect(scoreCommand(nav("Zürich Relay"), ["zurich"])).toBe(
      LABEL_SCORES.prefix,
    );
  });
});

describe("indexCommand", () => {
  it("normalises once and leaves node hints out", () => {
    const entry = indexCommand(node);
    expect(entry.label.text).toBe("sovereignnet: big hill");
    expect(entry.label.words).toEqual(["sovereignnet", "big", "hill"]);
    expect(entry.secondary.map((field) => field.text)).toEqual([
      "snbh",
      "!0000abcd",
    ]);
  });
});
