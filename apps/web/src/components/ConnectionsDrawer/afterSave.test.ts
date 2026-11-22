import { describe, expect, it } from "vitest";
import { closesAfterSave } from "./afterSave.ts";

describe("closesAfterSave", () => {
  it.each(["connected", "configured", "online"] as const)(
    "closes once %s",
    (status) => {
      expect(closesAfterSave(status)).toBe(true);
    },
  );

  it.each(["connecting", "configuring"] as const)(
    "closes while still %s",
    (status) => {
      expect(closesAfterSave(status)).toBe(true);
    },
  );

  it.each(["error", "disconnected", "disconnecting"] as const)(
    "stays open on the saved list when %s",
    (status) => {
      expect(closesAfterSave(status)).toBe(false);
    },
  );
});
