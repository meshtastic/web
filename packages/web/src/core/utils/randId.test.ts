import { beforeEach, describe, expect, it, vi } from "vitest";
import { randId } from "./randId.ts";

describe("randId", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a number", () => {
    const result = randId();
    expect(typeof result).toBe("number");
  });

  it("returns an integer", () => {
    const result = randId();
    expect(Number.isInteger(result)).toBe(true);
  });

  it("uses Math.random to generate the number", () => {
    const mockRandom = vi.spyOn(Math, "random").mockReturnValue(0.5);
    const result = randId();

    expect(mockRandom).toHaveBeenCalled();
    expect(result).toBe(Math.floor(0.5 * 1e9));
  });

  it("returns a value between 0 and 1e9 (exclusive)", () => {
    const result = randId();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1e9);
  });

  it("returns different values on subsequent calls", () => {
    vi.spyOn(Math, "random").mockRestore();

    const results = new Set();

    for (let i = 0; i < 100; i++) {
      results.add(randId());
    }

    expect(results.size).toBeGreaterThan(95);
  });
});
