import {
  SETTINGS_SECTION_IDS,
  type SettingsSectionId,
} from "@core/settings/registry.ts";
import type { NavPath } from "@core/navigation/navItems.ts";

/**
 * Command menu model. Every result row is plain data: a discriminated union
 * on `kind`, with no callbacks, so the registry can be built, filtered and
 * ranked in pure code. The component owns the single `run` switch that turns
 * a command into an effect.
 */

/** Result groups, in their default display order. */
export const commandGroupIds = [
  "conversations",
  "nodes",
  "commands",
  "navigation",
  "settings",
] as const;

export type CommandGroupId = (typeof commandGroupIds)[number];

/** Dialogs a command can open (a subset of the device store's dialogs). */
export type CommandDialogId =
  | "QR"
  | "import"
  | "shutdown"
  | "reboot"
  | "resetNodeDb"
  | "factoryResetDevice"
  | "factoryResetConfig"
  | "deleteMessages"
  | "clearAllStores";

/** Pickers that replace the result list until a choice is made. */
export type CommandPageId = "traceroute" | "switchDevice";

/** What an `action` command does when chosen. */
export type CommandAction =
  | { readonly type: "dialog"; readonly dialog: CommandDialogId }
  | { readonly type: "openPage"; readonly page: CommandPageId }
  | { readonly type: "connectDevice" }
  | { readonly type: "disconnect" }
  | { readonly type: "enterDfuMode" }
  | { readonly type: "reconfigure" }
  | { readonly type: "switchDevice"; readonly deviceId: number }
  /** Pin or unpin a result group; the menu stays open. */
  | { readonly type: "togglePin"; readonly group: CommandGroupId };

/** Settings pages the menu links to: the settings registry's section ids. */
export const settingsSectionSlugs = SETTINGS_SECTION_IDS;

export type SettingsSectionSlug = SettingsSectionId;

/**
 * Every path a command can open. The shell checks this union against the
 * router's registered paths at compile time.
 */
export type CommandPath = NavPath | `/settings/${SettingsSectionSlug}`;

/** A router destination: a path plus optional search params. */
export interface NavigateTarget {
  readonly to: CommandPath;
  readonly search?: { readonly tab: string };
}

export type ConversationTarget =
  | { readonly type: "broadcast"; readonly channel: number }
  | { readonly type: "direct"; readonly nodeNum: number };

/** Icon names the component maps to glyphs; keeps lucide out of the core. */
export type CommandIconName =
  | "messages"
  | "map"
  | "nodes"
  | "settings"
  | "user"
  | "lora"
  | "channels"
  | "security"
  | "device"
  | "module"
  | "administration"
  | "backup"
  | "cleanNodes"
  | "debug"
  | "app"
  | "filter"
  | "about"
  | "help"
  | "switchDevice"
  | "connect"
  | "qrCode"
  | "qrImport"
  | "shutdown"
  | "reboot"
  | "dfu"
  | "trash"
  | "disconnect"
  | "factory"
  | "eraser"
  | "traceroute"
  | "pin"
  | "unpin";

interface CommandBase {
  /** Unique across the whole menu; also the cmdk item value. */
  readonly id: string;
  readonly group: CommandGroupId;
  readonly label: string;
  /** Secondary text beside the label ("3 unread", "2 hops · 5 min ago"). */
  readonly hint?: string;
  /** Extra search terms that are not shown. */
  readonly keywords?: ReadonlyArray<string>;
  /** Only listed while the user is searching (sub-items, long tails). */
  readonly searchOnly?: boolean;
}

export type Command =
  | (CommandBase & {
      readonly kind: "navigate";
      readonly icon: CommandIconName;
      readonly target: NavigateTarget;
      /** Key sequence that does the same from anywhere, e.g. ["G", "M"]. */
      readonly shortcut?: readonly [string, string];
    })
  | (CommandBase & {
      readonly kind: "action";
      readonly icon: CommandIconName;
      readonly action: CommandAction;
      /** Destructive or disruptive; drawn in the danger colour. */
      readonly danger?: boolean;
    })
  | (CommandBase & {
      readonly kind: "node";
      readonly nodeNum: number;
      readonly initials: string;
    })
  | (CommandBase & {
      readonly kind: "conversation";
      readonly target: ConversationTarget;
      readonly unread: number;
      /** Avatar initials for direct messages; channels draw "#". */
      readonly initials?: string;
    });

export type CommandKind = Command["kind"];

/** Minimal translate function; i18next's `t` satisfies it. */
export type Translate = (
  key: string,
  options?: Record<string, unknown>,
) => string;
