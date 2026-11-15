import { describe, expect, it } from "vitest";
import {
  firmwareAtLeast,
  firmwareSupport,
  parseFirmwareVersion,
} from "./firmware.ts";

describe("firmware versions", () => {
  it("parses a version with a hash suffix", () => {
    expect(parseFirmwareVersion("2.7.15.abc1234")).toEqual([2, 7, 15]);
    expect(parseFirmwareVersion("")).toBeUndefined();
  });

  it("compares versions numerically", () => {
    expect(firmwareAtLeast("2.10.0", "2.9.5")).toBe(true);
    expect(firmwareAtLeast("2.7.18", "2.7.18")).toBe(true);
    expect(firmwareAtLeast("2.7.17", "2.7.18")).toBe(false);
    expect(firmwareAtLeast("garbage", "2.7.18")).toBe(false);
  });

  it("grades support like the Android app", () => {
    expect(firmwareSupport("2.8.0")).toBe("supported");
    expect(firmwareSupport("2.4.0")).toBe("shouldUpdate");
    expect(firmwareSupport("2.3.0")).toBe("tooOld");
    expect(firmwareSupport("")).toBe("unknown");
  });
});
