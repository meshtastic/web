import { describe, expect, it } from "vitest";
import { buildResults, flattenResults } from "./results.ts";
import { indexCommands, parseQuery } from "./search.ts";
import type { Command, SettingsSectionSlug } from "./types.ts";

const channel = (index: number, label: string): Command => ({
  kind: "conversation",
  id: `conversation:channel:${index}`,
  group: "conversations",
  label,
  target: { type: "broadcast", channel: index },
  unread: 0,
});

const node = (num: number, label: string): Command => ({
  kind: "node",
  id: `node:${num}`,
  group: "nodes",
  label,
  nodeNum: num,
  initials: label.slice(0, 2),
});

const action = (id: string, label: string, searchOnly = false): Command => ({
  kind: "action",
  id: `action:${id}`,
  group: "commands",
  label,
  icon: "reboot",
  action: { type: "reconfigure" },
  searchOnly,
});

const settings = (id: SettingsSectionSlug, label: string): Command => ({
  kind: "navigate",
  id: `settings:${id}`,
  group: "settings",
  label,
  icon: "lora",
  target: { to: `/settings/${id}` },
});

const registry: Command[] = [
  channel(0, "Primary"),
  node(1, "IB North"),
  node(2, "Map Maker"),
  action("reboot", "Reboot device"),
  action("device:7", "Base station", true),
  {
    kind: "navigate",
    id: "goto:map",
    group: "navigation",
    label: "Map",
    icon: "map",
    target: { to: "/map" },
  },
  settings("lora", "LoRa"),
];

const ids = (groups: ReturnType<typeof buildResults>) =>
  groups.map((group) => [group.id, group.commands.map((c) => c.id)]);

describe("buildResults", () => {
  it("lists every group in default order while browsing", () => {
    expect(ids(buildResults(indexCommands(registry), parseQuery("")))).toEqual([
      ["conversations", ["conversation:channel:0"]],
      ["nodes", ["node:1", "node:2"]],
      ["commands", ["action:reboot"]],
      ["navigation", ["goto:map"]],
      ["settings", ["settings:lora"]],
    ]);
  });

  it("hides search-only rows until the user types", () => {
    const browse = flattenResults(
      buildResults(indexCommands(registry), parseQuery("")),
    );
    expect(browse.some((c) => c.id === "action:device:7")).toBe(false);
    const search = flattenResults(
      buildResults(indexCommands(registry), parseQuery("base")),
    );
    expect(search.map((c) => c.id)).toEqual(["action:device:7"]);
  });

  it("orders groups by their best match when searching", () => {
    // "map" is an exact navigation match and only a prefix node match.
    expect(
      ids(buildResults(indexCommands(registry), parseQuery("map"))),
    ).toEqual([
      ["navigation", ["goto:map"]],
      ["nodes", ["node:2"]],
    ]);
  });

  it("sorts rows within a group by score, then registry order", () => {
    const rows: Command[] = [
      node(1, "North Ridge"),
      node(2, "IB North"),
      node(3, "north"),
    ];
    const [group] = buildResults(indexCommands(rows), parseQuery("north"));
    expect(group?.commands.map((c) => c.id)).toEqual([
      "node:3",
      "node:1",
      "node:2",
    ]);
  });

  it("keeps only navigation and actions in > mode", () => {
    expect(ids(buildResults(indexCommands(registry), parseQuery(">")))).toEqual(
      [
        ["commands", ["action:reboot"]],
        ["navigation", ["goto:map"]],
        ["settings", ["settings:lora"]],
      ],
    );
    expect(
      ids(buildResults(indexCommands(registry), parseQuery("> map"))),
    ).toEqual([["navigation", ["goto:map"]]]);
  });

  it("caps entity groups with separate browsing and searching limits", () => {
    const many = Array.from({ length: 20 }, (_, i) => node(i, `Node ${i}`));
    const limits = { browsing: { nodes: 3 }, searching: { nodes: 5 } };
    const [browse] = buildResults(indexCommands(many), parseQuery(""), {
      limits,
    });
    expect(browse?.commands).toHaveLength(3);
    const [search] = buildResults(indexCommands(many), parseQuery("node"), {
      limits,
    });
    expect(search?.commands).toHaveLength(5);
  });

  it("puts pinned groups first", () => {
    const groups = buildResults(indexCommands(registry), parseQuery(""), {
      pinned: ["settings"],
    });
    expect(groups[0]?.id).toBe("settings");
    const searched = buildResults(indexCommands(registry), parseQuery("map"), {
      pinned: ["nodes"],
    });
    expect(searched[0]?.id).toBe("nodes");
  });

  it("returns nothing when nothing matches", () => {
    expect(buildResults(indexCommands(registry), parseQuery("zzzz"))).toEqual(
      [],
    );
  });
});
