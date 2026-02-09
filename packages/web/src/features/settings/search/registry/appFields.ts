import type { FieldRegistryEntry } from "../types.ts";

export const appFieldRegistry: FieldRegistryEntry[] = [
  {
    section: "app",
    tab: "appearance",
    groupLabelKey: "preferences.appearance.title",
    groupNamespace: "ui",
    fields: [
      {
        name: "theme",
        labelKey: "preferences.appearance.theme",
        namespace: "ui",
      },
    ],
  },
  {
    section: "app",
    tab: "localization",
    groupLabelKey: "preferences.localization.title",
    groupNamespace: "ui",
    fields: [
      {
        name: "language",
        labelKey: "preferences.localization.language",
        namespace: "ui",
      },
      {
        name: "dateFormat",
        labelKey: "preferences.localization.dateFormat",
        namespace: "ui",
      },
    ],
  },
  {
    section: "app",
    tab: "audio",
    groupLabelKey: "preferences.audio.title",
    groupNamespace: "ui",
    fields: [
      {
        name: "messageSound",
        labelKey: "preferences.audio.messageSound.label",
        descriptionKey: "preferences.audio.messageSound.description",
        namespace: "ui",
      },
      {
        name: "alertSound",
        labelKey: "preferences.audio.alertSound.label",
        descriptionKey: "preferences.audio.alertSound.description",
        namespace: "ui",
      },
      {
        name: "volume",
        labelKey: "preferences.audio.volume.label",
        descriptionKey: "preferences.audio.volume.description",
        namespace: "ui",
      },
    ],
  },
];
