import { describe, expect, it } from "vitest";
import { randId } from "./randId.ts";

describe("randId", () => {
  it("returns an integer", () => {
    const result = randId();
    expect(typeof result).toBe("number");
    expect(Number.isInteger(result)).toBe(true);
  });

  it("returns a value within the uint32 range", () => {
    const result = randId();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });

  it("returns unique values across many calls", () => {
    const results = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      results.add(randId());
    }
    // With 32 bits of entropy over 1000 samples, collisions are vanishingly rare.
    expect(results.size).toBe(1000);
  });
});
