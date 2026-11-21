import { describe, expect, it } from "vitest";
import { buildResults } from "./results.ts";
import { indexCommands, parseQuery } from "./search.ts";
import {
  buildRegistry,
  type NodeSource,
  type RegistryInput,
} from "./sources.ts";
import type { Translate } from "./types.ts";

const t: Translate = (key, options) =>
  options && "count" in options ? `${key}:${String(options.count)}` : key;

const NOW = Date.UTC(2026, 10, 21, 12);
const NODE_COUNT = 1000;

const nodes: NodeSource[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
  num: 1000 + i,
  longName: `Relay ${i}`,
  shortName: `R${i % 1000}`,
  hopsAway: i % 4,
  lastHeard: NOW / 1000 - i * 60,
  isFavorite: i % 97 === 0,
}));

const input: RegistryInput = {
  t,
  locale: "en",
  now: NOW,
  channels: [{ index: 0, disabled: false }],
  nodes,
  unreadByKey: new Map([["direct:1500", 2]]),
  myNodeNum: 1000,
  devices: [],
  deviceTabs: [],
  moduleTabs: [],
};

describe("a 1000-node mesh", () => {
  const index = indexCommands(buildRegistry(input));

  it("keeps the browsing list short", () => {
    const groups = buildResults(index, parseQuery(""));
    const nodesGroup = groups.find((group) => group.id === "nodes");
    expect(nodesGroup?.commands).toHaveLength(5);
    // Favourites lead: 1097 is the first favourite after the radio itself.
    expect(nodesGroup?.commands[0]?.id).toBe("node:1097");
    const conversations = groups.find((g) => g.id === "conversations");
    expect(conversations?.commands.map((c) => c.id)).toEqual([
      "conversation:channel:0",
      "conversation:direct:1500",
    ]);
  });

  it("finds one node by name among a thousand", () => {
    const groups = buildResults(index, parseQuery("relay 742"));
    const first = (id: string) =>
      groups.find((group) => group.id === id)?.commands[0]?.id;
    expect(first("nodes")).toBe("node:1742");
    expect(first("conversations")).toBe("conversation:direct:1742");
  });

  it("caps broad matches", () => {
    const groups = buildResults(index, parseQuery("relay"));
    expect(groups.find((g) => g.id === "nodes")?.commands).toHaveLength(8);
  });

  it("scores a keystroke over the indexed registry quickly", () => {
    const started = performance.now();
    for (const query of ["r", "re", "rel", "rela", "relay", "relay 9"]) {
      buildResults(index, parseQuery(query));
    }
    // Generous bound for slow CI; typically a few milliseconds.
    expect(performance.now() - started).toBeLessThan(500);
  });
});
