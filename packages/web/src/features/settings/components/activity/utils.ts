import type { ValidConfigType } from "@state/index.ts";
import type { ActivityItem, GroupedActivities } from "./types.ts";

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return "Just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

export function getCategoryForConfig(variant: ValidConfigType): string {
  const radioConfigs: ValidConfigType[] = ["lora", "security"];
  return radioConfigs.includes(variant) ? "Radio Config" : "Device Config";
}

export function groupByCategory(items: ActivityItem[]): GroupedActivities[] {
  const groups = new Map<string, ActivityItem[]>();

  for (const item of items) {
    const existing = groups.get(item.category) ?? [];
    groups.set(item.category, [...existing, item]);
  }

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    items,
  }));
}
