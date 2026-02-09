export type SettingsSection =
  | "radio"
  | "device"
  | "module"
  | "app"
  | "advanced";

/**
 * A searchable field in the settings index.
 * This represents a single field that can be found via search.
 */
export interface SearchableField {
  /** Unique identifier: "device.config.device.role" */
  id: string;
  /** Form field name: "role" */
  fieldName: string;
  /** Translated label */
  label: string;
  /** Translated description */
  description: string;
  /** Top-level section: "radio" | "device" | "module" | "app" | "advanced" */
  section: SettingsSection;
  /** Tab identifier within section: "device", "lora", "mqtt", etc. */
  tab: string;
  /** Field group title (translated) */
  groupLabel: string;
}

/**
 * A field entry in the registry (before translation).
 */
export interface FieldRegistryField {
  /** Field name (matches form field path) */
  name: string;
  /** i18n key for label, e.g., "device.role.label" */
  labelKey: string;
  /** i18n key for description, e.g., "device.role.description" */
  descriptionKey?: string;
  /** i18n namespace override (defaults to "config") */
  namespace?: string;
}

/**
 * A group of fields in the registry.
 */
export interface FieldRegistryEntry {
  /** Top-level section */
  section: SettingsSection;
  /** Tab within section */
  tab: string;
  /** i18n key for group label, e.g., "device.title" */
  groupLabelKey: string;
  /** i18n namespace for group label (defaults to "config") */
  groupNamespace?: string;
  /** Fields in this group */
  fields: FieldRegistryField[];
}

/**
 * Search result with match information.
 */
export interface SearchResult extends SearchableField {
  /** Which part of the field matched */
  matchType: "label" | "description" | "both";
  /** Match score for sorting (higher is better) */
  score: number;
}

/**
 * Grouped search results for display in dropdown.
 */
export interface GroupedSearchResults {
  /** Section key */
  section: SettingsSection;
  /** Translated section label */
  sectionLabel: string;
  /** Fields matching in this section */
  fields: SearchResult[];
}
