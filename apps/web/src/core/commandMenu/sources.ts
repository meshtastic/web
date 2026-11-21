import {
  formatNodeId,
  initialsFor,
  nodeDisplayName,
  nodeIdSuffix,
} from "@core/utils/nodeIdentity.ts";
import { formatRelativeTime } from "@core/utils/timeFormat.ts";
import { type NavDestination, navPaths } from "@core/navigation/navItems.ts";
import { chordKeysFor } from "./chords.ts";
import { settingsPath, settingsSections } from "./settingsSections.ts";
import {
  type Command,
  type CommandAction,
  type CommandGroupId,
  type CommandIconName,
  commandGroupIds,
  type Translate,
} from "./types.ts";

/**
 * Builders that turn app data into command rows. Inputs are plain values the
 * shell reads from stores and hooks; labels go through the supplied
 * translate function (default namespace: `commandPalette`).
 */

export interface ChannelSource {
  readonly index: number;
  /** Name set on the device; empty for unnamed channels. */
  readonly name?: string;
  readonly disabled: boolean;
}

export interface NodeSource {
  readonly num: number;
  readonly longName?: string;
  readonly shortName?: string;
  readonly hopsAway?: number;
  /** Epoch seconds; 0 or undefined when never heard. */
  readonly lastHeard?: number;
  readonly isFavorite: boolean;
}

export interface DeviceSource {
  readonly id: number;
  readonly name: string;
}

export interface SettingsTabSource {
  readonly key: string;
  readonly labelKey: string;
}

export interface RegistryInput {
  readonly t: Translate;
  readonly locale: string;
  /** Epoch milliseconds, for "heard 5 min ago". */
  readonly now: number;
  readonly channels: ReadonlyArray<ChannelSource>;
  readonly nodes: ReadonlyArray<NodeSource>;
  /** Unread counts keyed `channel:<index>` / `direct:<nodeNum>`. */
  readonly unreadByKey: ReadonlyMap<string, number>;
  /** The connected radio; left out of node and DM results. */
  readonly myNodeNum?: number;
  /** Connected radio's name, shown beside device actions. */
  readonly deviceName?: string;
  readonly devices: ReadonlyArray<DeviceSource>;
  readonly deviceTabs: ReadonlyArray<SettingsTabSource>;
  readonly moduleTabs: ReadonlyArray<SettingsTabSource>;
}

type NodeText = Pick<RegistryInput, "t" | "locale" | "now">;

/** Space-separated translated search words → list. */
export const splitKeywords = (text: string): string[] =>
  text.split(/\s+/u).filter(Boolean);

export const channelLabel = (channel: ChannelSource, t: Translate): string => {
  const name = channel.name?.trim();
  if (name) {
    return name;
  }
  return channel.index === 0
    ? t("page.broadcastLabel", { ns: "channels" })
    : t("page.channelIndex", { ns: "channels", index: channel.index });
};

export const nodeName = (node: NodeSource, t: Translate): string =>
  nodeDisplayName(node, node.num, (last4) => t("fallbackName", { last4 }));

/** "Direct · 5 minutes ago", "2 hops", or undefined when nothing is known. */
export const nodeHint = (
  node: NodeSource,
  { t, locale, now }: NodeText,
): string | undefined => {
  const parts: string[] = [];
  if (node.hopsAway === 0) {
    parts.push(t("hint.direct"));
  } else if (node.hopsAway !== undefined) {
    parts.push(t("hint.hops", { count: node.hopsAway }));
  }
  if (node.lastHeard !== undefined && node.lastHeard > 0) {
    parts.push(formatRelativeTime(node.lastHeard * 1000, now, locale));
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
};

/** Favourites first, then most recently heard. */
export const compareNodes = (a: NodeSource, b: NodeSource): number =>
  Number(b.isFavorite) - Number(a.isFavorite) ||
  (b.lastHeard ?? 0) - (a.lastHeard ?? 0) ||
  a.num - b.num;

const remoteNodes = (
  input: Pick<RegistryInput, "nodes" | "myNodeNum">,
): NodeSource[] =>
  input.nodes.filter((node) => node.num !== input.myNodeNum).sort(compareNodes);

const nodeKeywords = (node: NodeSource): string[] =>
  [node.shortName, formatNodeId(node.num), nodeIdSuffix(node.num)].filter(
    (value): value is string => typeof value === "string" && value !== "",
  );

const unreadFor = (
  unreadByKey: ReadonlyMap<string, number>,
  key: string,
): number => unreadByKey.get(key) ?? 0;

/**
 * Channels (all enabled ones) and direct messages. A DM is listed while
 * browsing only when it has unread messages; any node can be found by name.
 */
export const conversationCommands = (input: RegistryInput): Command[] => {
  const { t } = input;
  const channels: Command[] = input.channels
    .filter((channel) => !channel.disabled)
    .sort((a, b) => a.index - b.index)
    .map((channel) => {
      const unread = unreadFor(input.unreadByKey, `channel:${channel.index}`);
      return {
        kind: "conversation",
        id: `conversation:channel:${channel.index}`,
        group: "conversations",
        label: channelLabel(channel, t),
        hint:
          unread > 0 ? t("hint.unread", { count: unread }) : t("hint.channel"),
        keywords: [t("hint.channel")],
        target: { type: "broadcast", channel: channel.index },
        unread,
      };
    });

  const direct = remoteNodes(input)
    .map((node) => ({
      node,
      unread: unreadFor(input.unreadByKey, `direct:${node.num}`),
    }))
    .sort((a, b) => b.unread - a.unread)
    .map(({ node, unread }): Command => ({
      kind: "conversation",
      id: `conversation:direct:${node.num}`,
      group: "conversations",
      label: nodeName(node, t),
      hint:
        unread > 0
          ? t("hint.unread", { count: unread })
          : t("hint.directMessage"),
      keywords: [t("hint.directMessage"), ...nodeKeywords(node)],
      target: { type: "direct", nodeNum: node.num },
      unread,
      initials: initialsFor(node, node.num),
      searchOnly: unread === 0,
    }));

  return [...channels, ...direct];
};

/** Remote nodes, favourites then most recently heard. */
export const nodeCommands = (
  input: RegistryInput,
  group: Command["group"] = "nodes",
): Command[] =>
  remoteNodes(input).map((node) => ({
    kind: "node",
    id: `node:${node.num}`,
    group,
    label: nodeName(node, input.t),
    hint: nodeHint(node, input),
    keywords: nodeKeywords(node),
    nodeNum: node.num,
    initials: initialsFor(node, node.num),
  }));

const navigationEntries = [
  { id: "messages", labelKey: "goto.command.messages" },
  { id: "nodes", labelKey: "goto.command.nodes" },
  { id: "map", labelKey: "goto.command.map" },
  { id: "settings", labelKey: "goto.command.config" },
] as const satisfies ReadonlyArray<{
  id: NavDestination & CommandIconName;
  labelKey: string;
}>;

/** Top-level destinations (the rail / tab bar items). */
export const navigationCommands = (t: Translate): Command[] =>
  navigationEntries.map((entry) => ({
    kind: "navigate",
    id: `goto:${entry.id}`,
    group: "navigation",
    label: t(entry.labelKey),
    keywords: [t("goto.label")],
    icon: entry.id,
    target: { to: navPaths[entry.id] },
    shortcut: chordKeysFor(navPaths[entry.id]),
  }));

/**
 * Every settings page, plus each device / module tab as a search-only row
 * ("Bluetooth — Device configuration").
 */
export const settingsCommands = (
  input: Pick<RegistryInput, "t" | "deviceTabs" | "moduleTabs">,
): Command[] => {
  const { t } = input;
  const settingsWord = t("settings.label");
  return settingsSections.flatMap((section): Command[] => {
    const label = t(section.labelKey, { ns: "config" });
    const page: Command = {
      kind: "navigate",
      id: `settings:${section.id}`,
      group: "settings",
      label,
      hint: t(section.hintKey),
      keywords: [
        settingsWord,
        ...(section.keywordsKey ? splitKeywords(t(section.keywordsKey)) : []),
      ],
      icon: section.icon,
      target: { to: settingsPath(section.id) },
    };
    if (section.tabs === undefined) {
      return [page];
    }
    const tabs =
      section.tabs === "device" ? input.deviceTabs : input.moduleTabs;
    const ns = section.tabs === "device" ? "config" : "moduleConfig";
    return [
      page,
      ...tabs.map((tab): Command => ({
        kind: "navigate",
        id: `settings:${section.id}:${tab.key}`,
        group: "settings",
        label: t(tab.labelKey, { ns }),
        hint: label,
        keywords: [settingsWord, tab.key],
        icon: section.icon,
        target: { to: settingsPath(section.id), search: { tab: tab.key } },
        searchOnly: true,
      })),
    ];
  });
};

interface ActionEntry {
  readonly id: string;
  readonly labelKey: string;
  readonly hintKey?: string;
  readonly icon: CommandIconName;
  readonly action: CommandAction;
  readonly danger?: boolean;
  /** Show the connected device's name as the hint. */
  readonly deviceHint?: boolean;
  /** `commandPalette` key of extra space-separated search words. */
  readonly keywordsKey?: string;
}

const actionEntries: ReadonlyArray<ActionEntry> = [
  {
    id: "traceroute",
    labelKey: "action.traceroute",
    hintKey: "hint.pickNode",
    icon: "traceroute",
    action: { type: "openPage", page: "traceroute" },
  },
  {
    id: "switchDevice",
    labelKey: "manage.command.switchNode",
    hintKey: "hint.pickDevice",
    icon: "switchDevice",
    action: { type: "openPage", page: "switchDevice" },
  },
  {
    id: "connectDevice",
    labelKey: "manage.command.connectNewNode",
    hintKey: "hint.connectMethods",
    icon: "connect",
    action: { type: "connectDevice" },
  },
  {
    id: "qrGenerator",
    labelKey: "action.qrGenerator",
    icon: "qrCode",
    action: { type: "dialog", dialog: "QR" },
    keywordsKey: "keywords.qr",
  },
  {
    id: "qrImport",
    labelKey: "action.qrImport",
    icon: "qrImport",
    action: { type: "dialog", dialog: "import" },
    keywordsKey: "keywords.qr",
  },
  {
    id: "reboot",
    labelKey: "contextual.command.scheduleReboot",
    icon: "reboot",
    action: { type: "dialog", dialog: "reboot" },
    deviceHint: true,
  },
  {
    id: "shutdown",
    labelKey: "contextual.command.scheduleShutdown",
    icon: "shutdown",
    action: { type: "dialog", dialog: "shutdown" },
    deviceHint: true,
  },
  {
    id: "disconnect",
    labelKey: "contextual.command.disconnect",
    icon: "disconnect",
    action: { type: "disconnect" },
    deviceHint: true,
  },
  {
    id: "dfuMode",
    labelKey: "contextual.command.dfuMode",
    hintKey: "hint.firmware",
    icon: "dfu",
    action: { type: "enterDfuMode" },
  },
  {
    id: "resetNodeDb",
    labelKey: "contextual.command.resetNodeDb",
    icon: "trash",
    action: { type: "dialog", dialog: "resetNodeDb" },
    danger: true,
  },
  {
    id: "factoryResetDevice",
    labelKey: "contextual.command.factoryResetDevice",
    icon: "factory",
    action: { type: "dialog", dialog: "factoryResetDevice" },
    danger: true,
  },
  {
    id: "factoryResetConfig",
    labelKey: "contextual.command.factoryResetConfig",
    icon: "factory",
    action: { type: "dialog", dialog: "factoryResetConfig" },
    danger: true,
  },
  {
    id: "reconfigure",
    labelKey: "debug.command.reconfigure",
    hintKey: "debug.label",
    icon: "reboot",
    action: { type: "reconfigure" },
  },
  {
    id: "clearAllStoredMessages",
    labelKey: "debug.command.clearAllStoredMessages",
    hintKey: "debug.label",
    icon: "eraser",
    action: { type: "dialog", dialog: "deleteMessages" },
    danger: true,
  },
  {
    id: "clearAllStores",
    labelKey: "debug.command.clearAllStores",
    hintKey: "debug.label",
    icon: "eraser",
    action: { type: "dialog", dialog: "clearAllStores" },
    danger: true,
  },
];

/** Device and app actions, plus one search-only row per known device. */
export const actionCommands = (
  input: Pick<RegistryInput, "t" | "deviceName" | "devices">,
): Command[] => {
  const { t } = input;
  const actions = actionEntries.map((entry): Command => ({
    kind: "action",
    id: `action:${entry.id}`,
    group: "commands",
    label: t(entry.labelKey),
    hint: entry.deviceHint
      ? input.deviceName
      : entry.hintKey
        ? t(entry.hintKey)
        : undefined,
    keywords: entry.keywordsKey ? splitKeywords(t(entry.keywordsKey)) : [],
    icon: entry.icon,
    action: entry.action,
    danger: entry.danger,
  }));
  const devices = deviceCommands(input).map((command): Command => ({
    ...command,
    searchOnly: true,
  }));
  return [...actions, ...devices];
};

/** One row per known device; choosing it makes that device active. */
export const deviceCommands = (
  input: Pick<RegistryInput, "t" | "devices">,
): Command[] =>
  input.devices.map((device) => ({
    kind: "action",
    id: `device:${device.id}`,
    group: "commands",
    label: device.name,
    hint: input.t("hint.switchToDevice"),
    keywords: [input.t("manage.command.switchNode")],
    icon: "switchDevice",
    action: { type: "switchDevice", deviceId: device.id },
  }));

/**
 * "Pin Nodes to the top" / "Unpin Nodes", one per group, search-only. Kept
 * out of the result list's group headings so the listbox holds only
 * options.
 */
export const pinCommands = (
  t: Translate,
  pinned: ReadonlyArray<CommandGroupId>,
): Command[] =>
  commandGroupIds.map((group) => {
    const isPinned = pinned.includes(group);
    const title = t(`groups.${group}`);
    return {
      kind: "action",
      id: `pin:${group}`,
      group: "commands",
      label: t(isPinned ? "unpinGroup.named" : "pinGroup.named", {
        group: title,
      }),
      keywords: splitKeywords(t("keywords.pin")),
      icon: isPinned ? "unpin" : "pin",
      action: { type: "togglePin", group },
      searchOnly: true,
    };
  });

/** The whole root registry, in default order within each group. */
export const buildRegistry = (input: RegistryInput): Command[] => [
  ...conversationCommands(input),
  ...nodeCommands(input),
  ...actionCommands(input),
  ...navigationCommands(input.t),
  ...settingsCommands(input),
];
