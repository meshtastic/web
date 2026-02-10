import type { TFunction } from "i18next";
import { allFieldRegistries } from "./registry/index.ts";
import type { SearchableField, SettingsSection } from "./types.ts";

/** Section labels for display in search results */
const SECTION_LABELS: Record<SettingsSection, string> = {
  radio: "Radio Config",
  device: "Device Config",
  module: "Module Config",
  app: "App Preferences",
  advanced: "Advanced",
};

export function getSectionLabel(section: SettingsSection): string {
  return SECTION_LABELS[section];
}

/**
 * Safely translate a key, returning the key itself if translation fails.
 */
function safeTranslate(t: TFunction, key: string, namespace?: string): string {
  const fullKey = namespace ? `${namespace}:${key}` : key;
  const result = t(fullKey, { defaultValue: "" });
  // If translation returns empty or the key itself, try without namespace
  if (!result || result === fullKey) {
    return t(key, { defaultValue: key });
  }
  return result;
}

/**
 * Build a searchable index from field registries.
 * This translates all field labels and descriptions using the provided i18n function.
 */
export function buildSearchIndex(t: TFunction): SearchableField[] {
  const index: SearchableField[] = [];

  for (const entry of allFieldRegistries) {
    const groupLabel = safeTranslate(
      t,
      entry.groupLabelKey,
      entry.groupNamespace ?? "config",
    );

    for (const field of entry.fields) {
      const namespace = field.namespace ?? "config";
      const label = safeTranslate(t, field.labelKey, namespace);
      const description = field.descriptionKey
        ? safeTranslate(t, field.descriptionKey, namespace)
        : "";

      index.push({
        id: `${entry.section}.${entry.tab}.${field.name}`,
        fieldName: field.name,
        label,
        description,
        section: entry.section,
        tab: entry.tab,
        groupLabel,
      });
    }
  }

  return index;
}
