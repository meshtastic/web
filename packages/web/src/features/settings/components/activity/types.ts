import type { ConfigChangeKey } from "../types.ts";

export interface ActivityItem {
  id: string; // For React keys
  type: "config" | "moduleConfig" | "channel" | "user";
  category: string; // "Radio Config", "Device Config", "Module Config"
  variant: string; // e.g., "lora", "mqtt", "security"
  label: string; // Human-readable from i18n
  timestamp: number;
  key: ConfigChangeKey; // For removal
  fieldPath: string | null; // The specific field path for this change
  hasChanges: boolean;
  originalValue: unknown; // Value to restore when undoing
  hasConflict: boolean; // True if device config changed since this edit was made
  currentDeviceValue?: unknown; // Current value on device (if different from originalValue)
}

export interface GroupedActivities {
  category: string;
  items: ActivityItem[];
}
