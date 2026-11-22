import { describe, expect, it } from "vitest";
import { adminKeySlots, MASKED_KEY } from "./securityKeys.ts";

describe("adminKeySlots", () => {
  it("has no keys and the first slot free when empty", () => {
    expect(adminKeySlots(["", "", ""])).toEqual({ filled: [], nextEmpty: 0 });
  });

  it("lists filled slots and the first gap", () => {
    expect(adminKeySlots(["a", "", "c"])).toEqual({
      filled: [
        { index: 0, value: "a" },
        { index: 2, value: "c" },
      ],
      nextEmpty: 1,
    });
  });

  it("has no free slot when all three hold keys", () => {
    expect(adminKeySlots(["a", "b", "c"]).nextEmpty).toBeUndefined();
  });

  it("treats missing and blank entries as empty", () => {
    expect(adminKeySlots(["  "]).nextEmpty).toBe(0);
    expect(adminKeySlots([]).filled).toEqual([]);
  });
});

describe("MASKED_KEY", () => {
  it("does not depend on the key", () => {
    expect(MASKED_KEY).toMatch(/^•+$/);
  });
});
