import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import { useMyNode } from "@shared/hooks";
import type { ActivityItem } from "./types.ts";

export function useActivityChanges() {
  const { myNodeNum } = useMyNode();
  const { pendingChanges, clearChange, clearAllChanges } =
    usePendingChanges(myNodeNum);

  // Transform database changes to activity items
  const activityItems: ActivityItem[] = pendingChanges.map((change) => {
    const sectionKey = `${change.changeType}:${change.variant ?? ""}`;

    // Determine category from change type and variant
    let category = "Settings";
    if (change.variant) {
      // Convert camelCase to Title Case
      const formatted =
        change.variant.charAt(0).toUpperCase() +
        change.variant
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

    if (change.changeType === "channel") {
      category = "Channels";
    }

    if (change.changeType === "user") {
      category = "User";
    }

    // Build the config change key based on change type
    let key: ActivityItem["key"];
    if (change.changeType === "channel" && change.channelIndex !== null) {
      key = {
        type: "channel",
        index: change.channelIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
      };
    } else if (change.changeType === "user") {
      key = { type: "user" };
    } else if (change.changeType === "moduleConfig" && change.variant) {
      key = {
        type: "moduleConfig",
        variant: change.variant as ActivityItem["key"] extends {
          type: "moduleConfig";
        }
          ? ActivityItem["key"]["variant"]
          : never,
      };
    } else if (change.changeType === "config" && change.variant) {
      key = {
        type: "config",
        variant: change.variant as ActivityItem["key"] extends {
          type: "config";
        }
          ? ActivityItem["key"]["variant"]
          : never,
      };
    } else {
      // Fallback - shouldn't happen in practice
      key = { type: "user" };
    }

    return {
      id: `${sectionKey}:${change.fieldPath ?? ""}`,
      type: change.changeType as "config" | "moduleConfig" | "channel",
      category,
      variant: change.variant ?? "",
      label: change.fieldPath ?? change.variant ?? change.changeType,
      timestamp: change.createdAt?.getTime() ?? Date.now(),
      key,
      hasChanges: true,
    };
  });

  return {
    activityItems,
    totalCount: activityItems.length,
    removeChange: (key: {
      section: { type: string; variant?: string };
      fieldName: string;
    }) =>
      clearChange({
        changeType: key.section.type as
          | "config"
          | "moduleConfig"
          | "channel"
          | "user",
        variant: key.section.variant,
        fieldPath: key.fieldName,
      }),
    clearAllChanges,
  };
}
