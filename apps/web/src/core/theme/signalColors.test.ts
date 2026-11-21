import { describe, expect, it } from "vitest";
import { signalLineColor, signalLineToken } from "./signalColors.ts";
import { colorTokens } from "./tokens.ts";

describe("signalLineColor", () => {
  it("resolves each quality to its theme token", () => {
    expect(signalLineColor("good", "dark")).toBe(colorTokens.dark.accent);
    expect(signalLineColor("good", "light")).toBe(colorTokens.light.accent);
    expect(signalLineColor("fair", "dark")).toBe(
      colorTokens.dark["warning-dirty"],
    );
    expect(signalLineColor("bad", "light")).toBe(
      colorTokens.light["danger-strong"],
    );
  });

  it("draws good, fair and bad links in distinct colours", () => {
    const tokens = new Set([
      signalLineToken.good,
      signalLineToken.fair,
      signalLineToken.bad,
    ]);
    expect(tokens.size).toBe(3);
  });
});
