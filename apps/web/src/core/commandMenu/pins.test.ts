import { describe, expect, it } from "vitest";
import {
  isCommandGroupId,
  migratePinnedGroups,
  togglePinnedGroup,
} from "./pins.ts";

describe("migratePinnedGroups", () => {
  it("maps the old palette's group ids", () => {
    expect(
      migratePinnedGroups([
        "gotoGroup",
        "settingsGroup",
        "manageGroup",
        "contextualGroup",
        "debugGroup",
      ]),
    ).toEqual(["navigation", "settings", "commands"]);
  });

  it("keeps current ids, drops duplicates and unknown values", () => {
    expect(
      migratePinnedGroups([
        "nodes",
        "nodes",
        "bogus",
        "debugGroup",
        "commands",
      ]),
    ).toEqual(["nodes", "commands"]);
  });
});

describe("togglePinnedGroup", () => {
  it("adds and removes", () => {
    expect(togglePinnedGroup(["nodes"], "settings")).toEqual([
      "nodes",
      "settings",
    ]);
    expect(togglePinnedGroup(["nodes", "settings"], "nodes")).toEqual([
      "settings",
    ]);
  });
});

describe("isCommandGroupId", () => {
  it("guards group ids", () => {
    expect(isCommandGroupId("nodes")).toBe(true);
    expect(isCommandGroupId("gotoGroup")).toBe(false);
  });
});
