/**
 * Admin messages staged in the config editor, by the settings tab they
 * belong to. They are sent with Save like a config section, so they count
 * as that tab's unsaved changes.
 */
const STAGED_KEY_MODULE: Record<string, string> = {
  cannedMessages: "cannedMessage",
  ringtone: "externalNotification",
};
const STAGED_KEY_DEVICE: Record<string, string> = {
  fixedPosition: "position",
  profileFixedPosition: "position",
};

export const DEVICE_SECTIONS = [
  "device",
  "position",
  "power",
  "network",
  "display",
  "bluetooth",
];

function withStaged(
  dirty: Set<string>,
  stagedKeys: Iterable<string>,
  mapping: Record<string, string>,
): Set<string> {
  for (const key of stagedKeys) {
    const tab = mapping[key];
    if (tab) dirty.add(tab);
  }
  return dirty;
}

/**
 * Module tabs with unsaved changes. The status message is excluded because
 * it is edited on the User page.
 */
export function dirtyModuleTabs(
  dirtyModuleSections: readonly string[],
  stagedKeys: Iterable<string>,
): Set<string> {
  return withStaged(
    new Set(dirtyModuleSections.filter((key) => key !== "statusmessage")),
    stagedKeys,
    STAGED_KEY_MODULE,
  );
}

/** Device configuration tabs with unsaved changes. */
export function dirtyDeviceTabs(
  dirtyRadioSections: readonly string[],
  stagedKeys: Iterable<string>,
): Set<string> {
  return withStaged(
    new Set(dirtyRadioSections.filter((key) => DEVICE_SECTIONS.includes(key))),
    stagedKeys,
    STAGED_KEY_DEVICE,
  );
}
