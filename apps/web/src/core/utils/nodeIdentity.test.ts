import { contrastRatio, parseHexColor } from "@core/theme/contrast.ts";
import { colorTokens, themeNames } from "@core/theme/tokens.ts";
import { describe, expect, it } from "vitest";
import {
  AVATAR_INK_DARK,
  AVATAR_INK_LIGHT,
  formatNodeId,
  initialsFor,
  nodeAvatarColors,
  nodeDisplayName,
  nodeIdSuffix,
} from "./nodeIdentity.ts";

const NUM = 0x71275a97;

describe("node ids", () => {
  it("formats the canonical id", () => {
    expect(formatNodeId(NUM)).toBe("!71275a97");
    expect(formatNodeId(0xab)).toBe("!000000ab");
  });

  it("takes the last four hex digits", () => {
    expect(nodeIdSuffix(NUM)).toBe("5A97");
    expect(nodeIdSuffix(0xab)).toBe("00AB");
  });

  it("treats numbers above 2^31 like unsigned", () => {
    expect(formatNodeId(0xfffffffe)).toBe("!fffffffe");
    expect(formatNodeId(-2)).toBe("!fffffffe");
  });
});

describe("initialsFor", () => {
  it("prefers the short name, verbatim", () => {
    expect(initialsFor({ shortName: "EAO1", longName: "Downtown" }, NUM)).toBe(
      "EAO1",
    );
    expect(initialsFor({ shortName: "ab" }, NUM)).toBe("ab");
  });

  it("caps at four characters without splitting emoji", () => {
    expect(initialsFor({ shortName: "👋👋👋👋👋" }, NUM)).toBe("👋👋👋👋");
  });

  it("falls back to long-name initials", () => {
    expect(initialsFor({ longName: "coulls base station" }, NUM)).toBe("CB");
    expect(initialsFor({ shortName: "  ", longName: "Hike" }, NUM)).toBe("H");
  });

  it("falls back to the id suffix", () => {
    expect(initialsFor({}, NUM)).toBe("5A97");
    expect(initialsFor({ shortName: null, longName: null }, NUM)).toBe("5A97");
  });
});

describe("nodeDisplayName", () => {
  const fallback = (suffix: string) => `Meshtastic ${suffix}`;

  it.each([
    [{ longName: "COULLS_BASE", shortName: "0c40" }, "COULLS_BASE"],
    [{ longName: "", shortName: "0c40" }, "0c40"],
    [{ longName: "  ", shortName: null }, "Meshtastic 5A97"],
    [{}, "Meshtastic 5A97"],
  ])("%j → %s", (names, expected) => {
    expect(nodeDisplayName(names, NUM, fallback)).toBe(expected);
  });
});

describe("nodeAvatarColors", () => {
  it("takes the colour from the node number's low 24 bits", () => {
    expect(nodeAvatarColors(0x00ff8000).background).toBe("rgb(255, 128, 0)");
  });

  it("picks ink for contrast, white on a tie like contrast-color()", () => {
    expect(nodeAvatarColors(0xffffff).ink).toBe("dark");
    expect(nodeAvatarColors(0x101010).ink).toBe("light");
  });

  it("moves a mid-tone fill away from its ink, keeping the hue", () => {
    const grey = parseRgb(nodeAvatarColors(0x7f7f7f).background);
    expect(grey.r).toBe(grey.g);
    expect(grey.g).toBe(grey.b);
    expect(grey.r).toBeGreaterThan(0x7f);
  });

  it("matches the avatar ink tokens", () => {
    for (const theme of themeNames) {
      expect(parseHexColor(colorTokens[theme]["avatar-ink-dark"])).toEqual(
        AVATAR_INK_DARK,
      );
      expect(parseHexColor(colorTokens[theme]["avatar-ink-light"])).toEqual(
        AVATAR_INK_LIGHT,
      );
    }
  });

  it("meets 7:1 on every sampled node colour, with the ink contrast-color() picks", () => {
    // Every channel step of 15 (18^3 colours), plus colours YIQ misjudges.
    const samples: number[] = [0x0000ff, 0xff0000, 0x808080, 0x7f7f7f];
    for (let r = 0; r <= 255; r += 15) {
      for (let g = 0; g <= 255; g += 15) {
        for (let b = 0; b <= 255; b += 15) {
          samples.push((r << 16) | (g << 8) | b);
        }
      }
    }
    const worst = Math.min(
      ...samples.map((num) => {
        const { background, ink, contrast } = nodeAvatarColors(num);
        const fill = parseRgb(background);
        const onDark = contrastRatio(fill, AVATAR_INK_DARK);
        const onLight = contrastRatio(fill, AVATAR_INK_LIGHT);
        // contrast-color() returns the higher-contrast of the two, white on a tie.
        expect(ink).toBe(onDark > onLight ? "dark" : "light");
        expect(Math.max(onDark, onLight)).toBeCloseTo(contrast);
        return contrast;
      }),
    );
    expect(worst).toBeGreaterThanOrEqual(7);
  });
});

function parseRgb(css: string): { r: number; g: number; b: number } {
  const match = /^rgb\((\d+), (\d+), (\d+)\)$/u.exec(css);
  if (!match) throw new Error(`not rgb(): ${css}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}
