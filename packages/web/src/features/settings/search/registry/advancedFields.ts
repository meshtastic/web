import type { FieldRegistryEntry } from "../types.ts";

export const advancedFieldRegistry: FieldRegistryEntry[] = [
  {
    section: "advanced",
    tab: "administration",
    groupLabelKey: "settings.advanced.administration.title",
    fields: [
      { name: "reboot", labelKey: "settings.advanced.administration.reboot" },
      {
        name: "shutdown",
        labelKey: "settings.advanced.administration.shutdown",
      },
      {
        name: "factoryReset",
        labelKey: "settings.advanced.administration.factoryReset",
      },
      {
        name: "resetNodeDb",
        labelKey: "settings.advanced.administration.resetNodeDb",
      },
    ],
  },
  {
    section: "advanced",
    tab: "database",
    groupLabelKey: "settings.advanced.database.title",
    fields: [
      { name: "cleanNodes", labelKey: "settings.database.cleanNodes" },
      {
        name: "downloadDatabase",
        labelKey: "settings.database.downloadDatabase",
      },
      { name: "deleteDatabase", labelKey: "settings.database.deleteDatabase" },
    ],
  },
  {
    section: "advanced",
    tab: "debugLog",
    groupLabelKey: "settings.advanced.debugLog.title",
    fields: [
      { name: "packetLog", labelKey: "settings.advanced.debugLog.packetLog" },
    ],
  },
  {
    section: "advanced",
    tab: "performance",
    groupLabelKey: "preferences.performance.title",
    groupNamespace: "ui",
    fields: [
      {
        name: "packetBatchSize",
        labelKey: "preferences.performance.packetBatchSize.label",
        descriptionKey: "preferences.performance.packetBatchSize.description",
        namespace: "ui",
      },
    ],
  },
];
