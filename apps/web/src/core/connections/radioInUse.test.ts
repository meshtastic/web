import { describe, expect, it } from "vitest";
import {
  closeOtherTabsTip,
  radioInUse,
  radioInUseAdvice,
} from "./radioInUse.ts";

describe("radioInUse", () => {
  it("reads only the failures another tab or app causes", () => {
    expect(radioInUse("busy")).toBe("busy");
    expect(radioInUse("interrupted")).toBe("interrupted");
    expect(radioInUse("network")).toBeUndefined();
    expect(radioInUse("cert")).toBeUndefined();
    expect(radioInUse(undefined)).toBeUndefined();
  });
});

describe("radioInUseAdvice", () => {
  it("tells a busy USB port to close the other tab or app, then retry", () => {
    expect(radioInUseAdvice("busy", "serial")).toEqual({
      title: "connections:inUse.busy.title",
      intro: "connections:inUse.busy.intro",
      tips: [
        "connections:inUse.closeOtherTabs.serial",
        "connections:inUse.quitApps",
        "connections:inUse.retry",
      ],
    });
  });

  it("leads an interrupted link with closing other tabs for its transport", () => {
    for (const type of ["serial", "bluetooth", "http"] as const) {
      expect(radioInUseAdvice("interrupted", type)).toEqual({
        title: "connections:inUse.interrupted.title",
        intro: "connections:inUse.interrupted.intro",
        tips: [closeOtherTabsTip(type)],
      });
    }
  });
});
