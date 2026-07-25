import { afterEach, describe, expect, it, vi } from "vitest";
import { randId } from "./randId.ts";

describe("randId", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an integer", () => {
    const result = randId();
    expect(typeof result).toBe("number");
    expect(Number.isInteger(result)).toBe(true);
  });

  it("uses crypto.getRandomValues to generate the number", () => {
    const mockGetRandomValues = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 42;
        }
        return array;
      });

    const result = randId();

    expect(mockGetRandomValues).toHaveBeenCalled();
    expect(result).toBe(42);
  });

  it("returns a value within the uint32 range", () => {
    const result = randId();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });

  it("returns unique values across many calls", () => {
    let counter = 0;
    vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      if (array instanceof Uint32Array) {
        array[0] = counter++;
      }
      return array;
    });

    const results = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      results.add(randId());
    }

    expect(results.size).toBe(1000);
  });
});
