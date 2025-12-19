import { useFieldRegistry } from "../../services/fieldRegistry";
import type { ActivityItem } from "./types.ts";

export function useActivityChanges() {
  const { getAllChanges, getField, removeChange, clearAllChanges } =
    useFieldRegistry();

  const changes = getAllChanges();

  // Transform field changes to activity items
  const activityItems: ActivityItem[] = changes.map((change) => {
    const field = getField(change.section, change.fieldName);
    const sectionKey = `${change.section.type}:${change.section.variant}`;

    // Determine category from section variant
    let category = "Settings";
    if (change.section.variant) {
      // Convert camelCase to Title Case
      const formatted =
        change.section.variant.charAt(0).toUpperCase() +
        change.section.variant
          .slice(1)
          .replace(/([A-Z])/g, " $1")
          .trim();

      // Handle common acronyms
      const acronymMap: Record<string, string> = {
        Mqtt: "MQTT",
        Lora: "Lora",
      };
      category = acronymMap[formatted] || formatted;
    }

    if (change.section.type === "channel") {
      category = "Channels";
    }

    return {
      id: `${sectionKey}:${change.fieldName}`,
      type: change.section.type,
      category,
      variant: change.section.variant,
      label: field?.label || change.fieldName,
      timestamp: change.timestamp,
      key: { section: change.section, fieldName: change.fieldName },
      hasChanges: true,
    };
  });

  return {
    activityItems,
    totalCount: activityItems.length,
    removeChange: (key: { section: any; fieldName: string }) =>
      removeChange(key.section, key.fieldName),
    clearAllChanges,
  };
}
