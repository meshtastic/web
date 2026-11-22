import { describe, expect, it } from "vitest";
import { filterGroups, groupBy, matchesQuery } from "./search.ts";

const items = [
  { id: "user", group: "configuration", label: "User" },
  { id: "lora", group: "configuration", label: "LoRa" },
  {
    id: "device",
    group: "configuration",
    label: "Device configuration",
    terms: ["Position", "Bluetooth"],
  },
  { id: "app", group: "app", label: "App settings" },
  { id: "about", group: "information", label: "Über" },
] as const;

describe("matchesQuery", () => {
  it("matches everything for a blank query", () => {
    expect(matchesQuery({ label: "User" }, "   ")).toBe(true);
  });

  it("ignores case, accents and surrounding space", () => {
    expect(matchesQuery({ label: "LoRa" }, " lora ")).toBe(true);
    expect(matchesQuery({ label: "Über" }, "uber")).toBe(true);
  });

  it("matches extra terms", () => {
    expect(matchesQuery(items[2], "blue")).toBe(true);
    expect(matchesQuery(items[0], "blue")).toBe(false);
  });
});

describe("groupBy and filterGroups", () => {
  const groups = groupBy(items, ["configuration", "app", "information"]);

  it("buckets items in group order", () => {
    expect(groups.map((g) => [g.group, g.items.length])).toEqual([
      ["configuration", 3],
      ["app", 1],
      ["information", 1],
    ]);
  });

  it("drops groups with no match", () => {
    const filtered = filterGroups(groups, "pos");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.items.map((i) => i.id)).toEqual(["device"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterGroups(groups, "zzz")).toEqual([]);
  });
});
