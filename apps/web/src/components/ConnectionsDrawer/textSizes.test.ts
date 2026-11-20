import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * WCAG 2.1 house floor: drawer text is sized through Tailwind's rem scale and
 * nothing renders below 12px. Arbitrary `text-[...]` sizes are caught here;
 * `text-xs` is the smallest named step.
 */
const drawerDir = import.meta.dirname;

const componentFiles = readdirSync(drawerDir)
  .filter((name) => /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name))
  .map((name) => join(drawerDir, name));

const ARBITRARY_TEXT_SIZE = /\btext-\[(\d*\.?\d+)(px|rem|em)\]/g;

const toPx = (value: number, unit: string) =>
  unit === "px" ? value : value * 16;

describe("drawer text sizes", () => {
  it("covers the drawer components", () => {
    expect(componentFiles.length).toBeGreaterThan(0);
  });

  it.each(componentFiles)(
    "%s uses no arbitrary text size below 12px",
    (file) => {
      const source = readFileSync(file, "utf8");
      const tooSmall = Array.from(source.matchAll(ARBITRARY_TEXT_SIZE)).filter(
        ([, value, unit]) => toPx(Number(value), unit ?? "px") < 12,
      );
      expect(tooSmall.map(([match]) => match)).toEqual([]);
    },
  );

  it.each(componentFiles)("%s has no fixed px font sizes", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source.match(/\btext-\[\d*\.?\d+px\]/g) ?? []).toEqual([]);
    expect(source.match(/fontSize:\s*["']?\d/g) ?? []).toEqual([]);
  });
});
