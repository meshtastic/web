import {
  SETTINGS_SECTIONS,
  type SettingsSectionId,
} from "@core/settings/registry.ts";
import type { CommandIconName, SettingsSectionSlug } from "./types.ts";

/**
 * Settings pages the command menu links to: the settings registry's
 * sections (ids, titles, order) plus the menu's own hint, keywords, icon.
 */
export interface SettingsSectionEntry {
  readonly id: SettingsSectionSlug;
  /** Title key in the `config` namespace. */
  readonly labelKey: string;
  /** Short description key in the `commandPalette` namespace. */
  readonly hintKey: string;
  /**
   * `commandPalette` key of extra, space-separated search words
   * ("radio region modem"), translated like the labels.
   */
  readonly keywordsKey?: string;
  readonly icon: CommandIconName;
  /** Has sub-tabs (device / module configuration). */
  readonly tabs?: "device" | "module";
}

/** What the command menu adds to each settings section of the registry. */
type CommandMenuExtras = Omit<SettingsSectionEntry, "id" | "labelKey">;

const EXTRAS: Readonly<Record<SettingsSectionId, CommandMenuExtras>> = {
  user: {
    hintKey: "settingsHint.user",
    keywordsKey: "keywords.user",
    icon: "user",
  },
  lora: {
    hintKey: "settingsHint.lora",
    keywordsKey: "keywords.lora",
    icon: "lora",
  },
  channels: { hintKey: "settingsHint.channels", icon: "channels" },
  security: {
    hintKey: "settingsHint.security",
    keywordsKey: "keywords.security",
    icon: "security",
  },
  device: { hintKey: "settingsHint.device", icon: "device", tabs: "device" },
  module: { hintKey: "settingsHint.module", icon: "module", tabs: "module" },
  administration: {
    hintKey: "settingsHint.administration",
    icon: "administration",
  },
  backup: {
    hintKey: "settingsHint.backup",
    keywordsKey: "keywords.backup",
    icon: "backup",
  },
  firmware: {
    hintKey: "settingsHint.firmware",
    keywordsKey: "keywords.firmware",
    icon: "dfu",
  },
  "clean-nodes": { hintKey: "settingsHint.cleanNodes", icon: "cleanNodes" },
  debug: { hintKey: "settingsHint.debug", icon: "debug" },
  app: {
    hintKey: "settingsHint.app",
    keywordsKey: "keywords.app",
    icon: "app",
  },
  "message-filter": {
    hintKey: "settingsHint.messageFilter",
    keywordsKey: "keywords.messageFilter",
    icon: "filter",
  },
  about: { hintKey: "settingsHint.about", icon: "about" },
  help: {
    hintKey: "settingsHint.help",
    keywordsKey: "keywords.help",
    icon: "help",
  },
};

/** The settings registry's sections, in sidebar order, with menu extras. */
export const settingsSections: ReadonlyArray<SettingsSectionEntry> =
  SETTINGS_SECTIONS.map((section) => ({
    id: section.id,
    labelKey: section.labelKey,
    ...EXTRAS[section.id],
  }));

/** Route path of a settings section. */
export const settingsPath = (
  id: SettingsSectionSlug,
): `/settings/${SettingsSectionSlug}` => `/settings/${id}`;
