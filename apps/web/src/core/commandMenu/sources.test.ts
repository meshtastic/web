import { describe, expect, it } from "vitest";
import { settingsSections } from "./settingsSections.ts";
import {
  actionCommands,
  buildRegistry,
  compareNodes,
  conversationCommands,
  deviceCommands,
  navigationCommands,
  nodeCommands,
  nodeHint,
  pinCommands,
  type RegistryInput,
  settingsCommands,
  splitKeywords,
} from "./sources.ts";
import { type Command, settingsSectionSlugs, type Translate } from "./types.ts";

/** Echoes the key and its options so assertions can see what was asked. */
const t: Translate = (key, options) => {
  if (!options) {
    return key;
  }
  const args = Object.entries(options)
    .map(([name, value]) => `${name}=${String(value)}`)
    .join(",");
  return `${key}(${args})`;
};

const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);
const MY_NODE = 100;

const input: RegistryInput = {
  t,
  locale: "en",
  now: NOW,
  channels: [
    { index: 1, name: "", disabled: false },
    { index: 0, name: "", disabled: false },
    { index: 2, name: "Hiking", disabled: false },
    { index: 3, name: "Off", disabled: true },
  ],
  nodes: [
    { num: MY_NODE, longName: "My Radio", isFavorite: false },
    {
      num: 1,
      longName: "IB North",
      shortName: "IB-N",
      hopsAway: 2,
      lastHeard: NOW / 1000 - 180,
      isFavorite: false,
    },
    {
      num: 2,
      longName: "COULLS_BASE",
      shortName: "0c40",
      hopsAway: 0,
      lastHeard: NOW / 1000 - 60,
      isFavorite: false,
    },
    { num: 0xabcd, isFavorite: true },
  ],
  unreadByKey: new Map([
    ["channel:0", 3],
    ["direct:1", 2],
  ]),
  myNodeNum: MY_NODE,
  deviceName: "EAO1",
  devices: [
    { id: 7, name: "Base" },
    { id: 8, name: "Car" },
  ],
  deviceTabs: [{ key: "bluetooth", labelKey: "page.tabBluetooth" }],
  moduleTabs: [{ key: "mqtt", labelKey: "page.tabMqtt" }],
};

const byId = (commands: Command[], id: string): Command | undefined =>
  commands.find((command) => command.id === id);

describe("nodeHint", () => {
  it("joins hops and last heard", () => {
    expect(
      nodeHint(
        { num: 1, hopsAway: 2, lastHeard: NOW / 1000 - 180, isFavorite: false },
        input,
      ),
    ).toBe("hint.hops(count=2) · 3 minutes ago");
  });

  it("says direct for zero hops and skips unknowns", () => {
    expect(nodeHint({ num: 1, hopsAway: 0, isFavorite: false }, input)).toBe(
      "hint.direct",
    );
    expect(
      nodeHint({ num: 1, lastHeard: 0, isFavorite: false }, input),
    ).toBeUndefined();
  });
});

describe("compareNodes", () => {
  it("puts favourites first, then the most recently heard", () => {
    const sorted = [
      { num: 1, lastHeard: 10, isFavorite: false },
      { num: 2, lastHeard: 5, isFavorite: true },
      { num: 3, lastHeard: 20, isFavorite: false },
    ].sort(compareNodes);
    expect(sorted.map((n) => n.num)).toEqual([2, 3, 1]);
  });
});

describe("conversationCommands", () => {
  const commands = conversationCommands(input);

  it("lists enabled channels by index with unread hints", () => {
    const channels = commands.filter(
      (c) => c.kind === "conversation" && c.target.type === "broadcast",
    );
    expect(channels.map((c) => c.label)).toEqual([
      "page.broadcastLabel(ns=channels)",
      "page.channelIndex(ns=channels,index=1)",
      "Hiking",
    ]);
    expect(channels[0]?.hint).toBe("hint.unread(count=3)");
    expect(channels[1]?.hint).toBe("hint.channel");
  });

  it("lists DMs except the connected radio, unread first", () => {
    const direct = commands.filter(
      (c) => c.kind === "conversation" && c.target.type === "direct",
    );
    expect(direct.map((c) => c.id)).toEqual([
      "conversation:direct:1",
      `conversation:direct:${0xabcd}`,
      "conversation:direct:2",
    ]);
    expect(direct[0]?.searchOnly).toBe(false);
    expect(direct[0]?.hint).toBe("hint.unread(count=2)");
    expect(direct[1]?.searchOnly).toBe(true);
    expect(direct[1]?.hint).toBe("hint.directMessage");
  });

  it("finds DMs by node id", () => {
    const dm = byId(commands, `conversation:direct:${0xabcd}`);
    expect(dm?.keywords).toContain("!0000abcd");
    expect(dm?.label).toBe("fallbackName(last4=ABCD)");
  });
});

describe("nodeCommands", () => {
  it("excludes the radio and orders favourites then recency", () => {
    const commands = nodeCommands(input);
    expect(commands.map((c) => c.id)).toEqual([
      `node:${0xabcd}`,
      "node:2",
      "node:1",
    ]);
    const north = byId(commands, "node:1");
    expect(north?.kind === "node" && north.initials).toBe("IB-N");
    expect(north?.hint).toBe("hint.hops(count=2) · 3 minutes ago");
  });

  it("can place nodes in another group (pickers)", () => {
    expect(nodeCommands(input, "commands")[0]?.group).toBe("commands");
  });
});

describe("navigationCommands", () => {
  it("covers every top-level destination", () => {
    const commands = navigationCommands(t);
    expect(
      commands.map((c) => (c.kind === "navigate" ? c.target.to : null)),
    ).toEqual(["/messages", "/nodes", "/map", "/settings"]);
  });

  it("shows each destination's G-chord", () => {
    const map = navigationCommands(t).find((c) => c.id === "goto:map");
    expect(map?.kind === "navigate" && map.shortcut).toEqual(["G", "M"]);
  });
});

describe("settingsCommands", () => {
  const commands = settingsCommands(input);

  it("has one visible row per settings section", () => {
    const visible = commands.filter((c) => !c.searchOnly);
    expect(visible.map((c) => c.id)).toEqual(
      settingsSections.map((s) => `settings:${s.id}`),
    );
    expect(byId(commands, "settings:lora")?.label).toBe(
      "navigation.lora(ns=config)",
    );
    expect(byId(commands, "settings:lora")?.hint).toBe("settingsHint.lora");
  });

  it("adds search-only tab rows linking with ?tab=", () => {
    const bluetooth = byId(commands, "settings:device:bluetooth");
    expect(bluetooth?.searchOnly).toBe(true);
    expect(bluetooth?.kind === "navigate" && bluetooth.target).toEqual({
      to: "/settings/device",
      search: { tab: "bluetooth" },
    });
    expect(bluetooth?.label).toBe("page.tabBluetooth(ns=config)");
    const mqtt = byId(commands, "settings:module:mqtt");
    expect(mqtt?.label).toBe("page.tabMqtt(ns=moduleConfig)");
  });
});

describe("actionCommands", () => {
  const commands = actionCommands(input);

  it("keeps every legacy palette action", () => {
    const actions = commands
      .filter((c) => !c.searchOnly)
      .map((c) => (c.kind === "action" ? c.action : null));
    expect(actions).toEqual(
      expect.arrayContaining([
        { type: "openPage", page: "switchDevice" },
        { type: "connectDevice" },
        { type: "dialog", dialog: "QR" },
        { type: "dialog", dialog: "import" },
        { type: "dialog", dialog: "shutdown" },
        { type: "dialog", dialog: "reboot" },
        { type: "enterDfuMode" },
        { type: "dialog", dialog: "resetNodeDb" },
        { type: "disconnect" },
        { type: "dialog", dialog: "factoryResetDevice" },
        { type: "dialog", dialog: "factoryResetConfig" },
        { type: "reconfigure" },
        { type: "dialog", dialog: "deleteMessages" },
        { type: "dialog", dialog: "clearAllStores" },
        { type: "openPage", page: "traceroute" },
      ]),
    );
  });

  it("shows the device name beside device actions", () => {
    expect(byId(commands, "action:reboot")?.hint).toBe("EAO1");
  });

  it("marks destructive actions", () => {
    const reset = byId(commands, "action:factoryResetDevice");
    expect(reset?.kind === "action" && reset.danger).toBe(true);
  });

  it("adds search-only rows to switch device", () => {
    const base = byId(commands, "device:7");
    expect(base?.searchOnly).toBe(true);
    expect(base?.kind === "action" && base.action).toEqual({
      type: "switchDevice",
      deviceId: 7,
    });
  });
});

describe("settings registry", () => {
  it("covers exactly the routed settings slugs", () => {
    expect(settingsSections.map((s) => s.id)).toEqual([
      ...settingsSectionSlugs,
    ]);
  });

  it("splits translated keywords", () => {
    expect(splitKeywords(" radio  region modem ")).toEqual([
      "radio",
      "region",
      "modem",
    ]);
    const lora = settingsCommands(input).find((c) => c.id === "settings:lora");
    expect(lora?.keywords).toEqual(["settings.label", "keywords.lora"]);
  });
});

describe("pinCommands", () => {
  it("offers pin or unpin per group, search-only", () => {
    const commands = pinCommands(t, ["nodes"]);
    const nodes = byId(commands, "pin:nodes");
    expect(nodes?.label).toBe("unpinGroup.named(group=groups.nodes)");
    expect(nodes?.kind === "action" && nodes.action).toEqual({
      type: "togglePin",
      group: "nodes",
    });
    expect(byId(commands, "pin:settings")?.label).toBe(
      "pinGroup.named(group=groups.settings)",
    );
    expect(commands.every((c) => c.searchOnly)).toBe(true);
  });
});

describe("deviceCommands", () => {
  it("lists every device for the picker", () => {
    expect(deviceCommands(input).map((c) => c.label)).toEqual(["Base", "Car"]);
  });
});

describe("buildRegistry", () => {
  it("has unique ids (cmdk values)", () => {
    const ids = buildRegistry(input).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
