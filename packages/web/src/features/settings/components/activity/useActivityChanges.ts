import { usePendingChanges } from "@data/hooks/usePendingChanges.ts";
import { useMyNode } from "@shared/hooks";
import { useUIStore } from "@state/ui/store.ts";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ActivityItem } from "./types.ts";

/**
 * Get the i18n translation key for a field path based on change type and variant.
 */
function getFieldLabelKey(
  changeType: string,
  variant: string | null,
  fieldPath: string | null,
): string | null {
  if (!fieldPath) return null;

  switch (changeType) {
    case "config":
      // config:<variant>.<fieldPath>.label
      return variant ? `config:${variant}.${fieldPath}.label` : null;
    case "moduleConfig":
      // moduleConfig:<variant>.<fieldPath>.label
      return variant ? `moduleConfig:${variant}.${fieldPath}.label` : null;
    case "user":
      // config:user.<fieldPath>.label
      return `config:user.${fieldPath}.label`;
    case "channel":
      // channels:<fieldPath>.label
      return `channels:${fieldPath}.label`;
    default:
      return null;
  }
}

/**
 * Convert camelCase field path to Title Case as fallback when no translation exists.
 */
function formatFieldPath(fieldPath: string): string {
  return fieldPath
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function useActivityChanges() {
  const { myNodeNum } = useMyNode();
  const { pendingChanges, clearChange } = usePendingChanges(myNodeNum);
  const { t } = useTranslation(["config", "moduleConfig", "channels"]);

  // Transform database changes to activity items
  const activityItems: ActivityItem[] = pendingChanges.map((change) => {
    const sectionKey = `${change.changeType}:${change.variant ?? ""}`;

    // Determine category from change type and variant
    let category = "Settings";
    if (change.variant) {
      const formatted =
        change.variant.charAt(0).toUpperCase() +
        change.variant
          .slice(1)
          .replace(/([A-Z])/g, " $1")
          .trim();

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

    const labelKey = getFieldLabelKey(
      change.changeType,
      change.variant,
      change.fieldPath,
    );
    let label = change.fieldPath ?? change.variant ?? change.changeType;
    if (labelKey) {
      const translated = t(labelKey, { defaultValue: "" });
      if (translated) {
        label = translated;
      } else if (change.fieldPath) {
        // Fallback to formatted field path
        label = formatFieldPath(change.fieldPath);
      }
    } else if (change.fieldPath) {
      label = formatFieldPath(change.fieldPath);
    }

    return {
      id: `${sectionKey}:${change.fieldPath ?? ""}`,
      type: change.changeType as "config" | "moduleConfig" | "channel" | "user",
      category,
      variant: change.variant ?? "",
      label,
      timestamp: change.createdAt?.getTime() ?? Date.now(),
      key,
      fieldPath: change.fieldPath,
      hasChanges: true,
      originalValue: change.originalValue,
    };
  });

  // Remove a single change, resetting the form field first
  const removeChange = useCallback(
    (item: ActivityItem) => {
      // First dispatch reset action so form hooks can reset the field
      useUIStore.getState().resetField({
        changeType: item.type,
        variant: item.variant || undefined,
        fieldPath: item.fieldPath ?? undefined,
        value: item.originalValue,
      });
      // Then clear the change from DB
      clearChange({
        changeType: item.type,
        variant: item.variant || undefined,
        channelIndex: item.key.type === "channel" ? item.key.index : undefined,
        fieldPath: item.fieldPath ?? undefined,
      });
    },
    [clearChange],
  );

  // Remove all changes by iterating through each item
  const removeAllChanges = useCallback(() => {
    for (const item of activityItems) {
      removeChange(item);
    }
  }, [activityItems, removeChange]);

  return {
    activityItems,
    totalCount: activityItems.length,
    removeChange,
    removeAllChanges,
  };
}
