import {
  DEVICE_SUBSECTION_IDS,
  type SettingsSectionId,
} from "@core/settings/registry.ts";
import { STAGED_FIXED_POSITION } from "@core/utils/stagedAdminKeys.ts";

/**
 * Which settings sections have unsaved edits, from the config editor's
 * dirty lists. Admin messages staged in the editor (canned messages,
 * ringtone, fixed position) are sent with Save like a config section, so
 * they count as their tab's unsaved changes.
 */

const STAGED_KEY_MODULE: Readonly<Record<string, string>> = {
  cannedMessages: "cannedMessage",
  ringtone: "externalNotification",
};
const STAGED_KEY_DEVICE: Readonly<Record<string, string>> = {
  [STAGED_FIXED_POSITION]: "position",
};

/** The radio sections the Device configuration section edits. */
export const DEVICE_SECTIONS: readonly string[] = DEVICE_SUBSECTION_IDS;

function withStaged(
  dirty: Set<string>,
  stagedKeys: Iterable<string>,
  mapping: Readonly<Record<string, string>>,
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

export interface EditorDirtyState {
  readonly dirtyRadio: readonly string[];
  readonly dirtyModule: readonly string[];
  readonly dirtyChannels: readonly number[];
  readonly ownerDirty: boolean;
  readonly stagedKeys: readonly string[];
}

/** Unsaved-change count per sidebar section; sections without edits are left out. */
export function sectionChangeCounts(
  state: EditorDirtyState,
): Partial<Record<SettingsSectionId, number>> {
  const radio = (key: string) => (state.dirtyRadio.includes(key) ? 1 : 0);
  // The status message is a module field that lives on the User page.
  const status = state.dirtyModule.includes("statusmessage") ? 1 : 0;
  const all: readonly (readonly [SettingsSectionId, number])[] = [
    ["user", (state.ownerDirty ? 1 : 0) + status],
    ["lora", radio("lora")],
    ["channels", state.dirtyChannels.length],
    ["security", radio("security")],
    ["device", dirtyDeviceTabs(state.dirtyRadio, state.stagedKeys).size],
    ["module", dirtyModuleTabs(state.dirtyModule, state.stagedKeys).size],
  ];
  const counts: Partial<Record<SettingsSectionId, number>> = {};
  for (const [id, count] of all) {
    if (count > 0) counts[id] = count;
  }
  return counts;
}
