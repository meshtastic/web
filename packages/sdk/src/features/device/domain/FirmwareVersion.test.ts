import { describe, expect, it } from "vitest";
import { firmwareAtLeast, firmwareSupport } from "./FirmwareVersion.ts";

describe("firmwareSupport", () => {
  it.each([
    ["2.8.1.8e6a88d", "supported"],
    ["2.5.14", "supported"],
    ["2.5.13.abc", "shouldUpdate"],
    ["2.3.15", "shouldUpdate"],
    ["2.3.14", "tooOld"],
    ["1.9.0", "tooOld"],
    ["", "unknown"],
    ["unknown", "unknown"],
  ])("%s is %s", (version, expected) => {
    expect(firmwareSupport(version)).toBe(expected);
  });

  it("compares numerically, not as text", () => {
    expect(firmwareAtLeast("2.10.0", "2.8.1")).toBe(true);
    expect(firmwareAtLeast("2.8.0", "2.8.1")).toBe(false);
    expect(firmwareAtLeast("", "2.8.1")).toBe(false);
  });
});
