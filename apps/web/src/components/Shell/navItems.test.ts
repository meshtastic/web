import { describe, expect, it } from "vitest";
import {
  activeDestination,
  isInDestination,
  railPrimaryDestinations,
  remoteNodeCount,
  shouldHideTabBar,
  tabBarDestinations,
} from "./navItems.ts";

describe("isInDestination", () => {
  it("matches the root and paths below it", () => {
    expect(isInDestination("/map", "map")).toBe(true);
    expect(isInDestination("/map/1/2/3", "map")).toBe(true);
    expect(isInDestination("/settings/lora", "settings")).toBe(true);
  });

  it("only matches on segment boundaries", () => {
    expect(isInDestination("/mapx", "map")).toBe(false);
    expect(isInDestination("/messagesfoo", "messages")).toBe(false);
  });
});

describe("activeDestination", () => {
  it("finds the destination for nested routes", () => {
    expect(activeDestination("/messages/broadcast/0")).toBe("messages");
    expect(activeDestination("/messages/direct/1234")).toBe("messages");
    expect(activeDestination("/nodes")).toBe("nodes");
    expect(activeDestination("/settings/device")).toBe("settings");
  });

  it("is undefined outside the top-level destinations", () => {
    expect(activeDestination("/")).toBeUndefined();
    expect(activeDestination("/dialog/abc")).toBeUndefined();
  });
});

describe("destination lists", () => {
  it("keeps settings out of the rail's top group but in the tab bar", () => {
    expect(railPrimaryDestinations).toEqual(["messages", "nodes", "map"]);
    expect(tabBarDestinations).toEqual([
      "messages",
      "nodes",
      "map",
      "settings",
    ]);
  });
});

describe("remoteNodeCount", () => {
  it("excludes the connected radio and never goes negative", () => {
    expect(remoteNodeCount(244)).toBe(243);
    expect(remoteNodeCount(1)).toBe(0);
    expect(remoteNodeCount(0)).toBe(0);
  });
});

describe("shouldHideTabBar", () => {
  it("hides when any match asks to", () => {
    expect(
      shouldHideTabBar([
        { staticData: {} },
        { staticData: { hideTabBar: true } },
      ]),
    ).toBe(true);
  });

  it("shows by default", () => {
    expect(shouldHideTabBar([])).toBe(false);
    expect(shouldHideTabBar([{}, { staticData: { hideTabBar: false } }])).toBe(
      false,
    );
  });
});
