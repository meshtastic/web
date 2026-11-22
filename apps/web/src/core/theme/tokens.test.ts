import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hexContrastRatio, meetsContrast, parseHexColor } from "./contrast.ts";
import {
  colorTokenNames,
  colorTokens,
  contrastExceptions,
  contrastRequirements,
  cssVariableName,
  effectTokenNames,
  effectTokens,
  radiusNames,
  shadowNames,
  type ThemeName,
  themeNames,
  typeScaleNames,
} from "./tokens.ts";

const indexCss = readFileSync(
  join(import.meta.dirname, "..", "..", "index.css"),
  "utf8",
);

const normalise = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Collects the `--mt-*` declarations from every rule whose selector is
 * exactly `[data-theme="<theme>"]` (descendant selectors such as
 * `[data-theme="dark"] [data-shadcn-scope]` do not count).
 */
function readThemeVariables(
  css: string,
  theme: ThemeName,
): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selector = `[data-theme="${theme}"]`;
  const variables = new Map<string, string>();
  for (const rule of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (rule[1]?.trim() !== selector) {
      continue;
    }
    for (const decl of (rule[2] ?? "").matchAll(/(--mt-[\w-]+)\s*:([^;]+);/g)) {
      const [, name, value] = decl;
      if (name !== undefined && value !== undefined) {
        variables.set(name, normalise(value));
      }
    }
  }
  return variables;
}

const expectedVariables = (theme: ThemeName): Map<string, string> =>
  new Map<string, string>([
    ...colorTokenNames.map((name): [string, string] => [
      cssVariableName(name),
      normalise(colorTokens[theme][name]),
    ]),
    ...effectTokenNames.map((name): [string, string] => [
      cssVariableName(name),
      normalise(effectTokens[theme][name]),
    ]),
  ]);

describe.each(themeNames)("%s theme tokens", (theme) => {
  const cssVariables = readThemeVariables(indexCss, theme);

  it("index.css declares every manifest token with the same value", () => {
    expect(Object.fromEntries(cssVariables)).toEqual(
      Object.fromEntries(expectedVariables(theme)),
    );
  });

  const exceptions = contrastExceptions.filter((e) => e.theme === theme);
  const isException = (fg: string, bg: string) =>
    exceptions.some((e) => e.fg === fg && e.bg === bg);

  it.each(contrastRequirements.filter(({ fg, bg }) => !isException(fg, bg)))(
    "$fg on $bg meets $min:1 ($use)",
    ({ fg, bg, min }) => {
      const ratio = hexContrastRatio(
        colorTokens[theme][fg],
        colorTokens[theme][bg],
      );
      expect(ratio).toBeDefined();
      expect(meetsContrast(ratio ?? 0, min), `${fg} on ${bg}: ${ratio}`).toBe(
        true,
      );
    },
  );

  it.runIf(exceptions.length > 0).each(exceptions)(
    "documented exception $fg on $bg is a required pair that still fails",
    ({ fg, bg }) => {
      const requirement = contrastRequirements.find(
        (r) => r.fg === fg && r.bg === bg,
      );
      expect(requirement).toBeDefined();
      const ratio = hexContrastRatio(
        colorTokens[theme][fg],
        colorTokens[theme][bg],
      );
      expect(ratio).toBeDefined();
      expect(meetsContrast(ratio ?? 0, requirement?.min ?? 0)).toBe(false);
    },
  );
});

describe("token manifest", () => {
  it("has no duplicate names", () => {
    const names = [...colorTokenNames, ...effectTokenNames];
    expect(new Set(names).size).toBe(names.length);
  });

  it("only lists exceptions for the dark mockup values", () => {
    expect(contrastExceptions.every((e) => e.theme === "dark")).toBe(true);
  });

  it("finds the theme blocks in index.css", () => {
    expect(readThemeVariables(indexCss, "dark").size).toBeGreaterThan(0);
    expect(
      readThemeVariables(
        '[data-theme="dark"] [data-shadcn-scope] { --mt-x: 1; }',
        "dark",
      ).size,
    ).toBe(0);
  });
});

/** Names declared as `--<prefix>-<name>: …` inside `@theme` blocks. */
const readThemeScale = (css: string, prefix: string): string[] => {
  const names = new Set<string>();
  for (const block of css.matchAll(/@theme(?:\s+inline)?\s*\{([^}]*)\}/g)) {
    const body = block[1] ?? "";
    for (const decl of body.matchAll(
      new RegExp(`--${prefix}-([a-z0-9-]+)\\s*:`, "g"),
    )) {
      const name = decl[1];
      if (
        name !== undefined &&
        !name.includes("--") &&
        !name.startsWith("color")
      ) {
        names.add(name);
      }
    }
  }
  return [...names].sort();
};

describe("token values", () => {
  it.each(themeNames)("every %s colour token is valid hex", (theme) => {
    for (const name of colorTokenNames) {
      expect(parseHexColor(colorTokens[theme][name]), name).toBeDefined();
    }
  });
});

describe("@theme scales stay in sync with cn()", () => {
  it("type scale", () => {
    // Tailwind's own steps may be re-sized in @theme; cn() already knows them.
    const builtIn = new Set(["xs", "sm", "base"]);
    expect(
      readThemeScale(indexCss, "text").filter((name) => !builtIn.has(name)),
    ).toEqual([...typeScaleNames].sort());
  });

  it("radius scale", () => {
    expect(readThemeScale(indexCss, "radius")).toEqual([...radiusNames].sort());
  });

  it("shadow scale", () => {
    expect(readThemeScale(indexCss, "shadow")).toEqual([...shadowNames].sort());
  });
});
