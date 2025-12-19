import type { ConfigChangeKey } from "../types.ts";

export interface ActivityItem {
  id: string; // For React keys
  type: "config" | "moduleConfig" | "channel";
  category: string; // "Radio Config", "Device Config", "Module Config"
  variant: string; // e.g., "lora", "mqtt", "security"
  label: string; // Human-readable from i18n
  timestamp: number;
  key: ConfigChangeKey; // For removal
  hasChanges: boolean;
}

export interface GroupedActivities {
  category: string;
  items: ActivityItem[];
}
