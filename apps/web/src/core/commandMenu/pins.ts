import { type CommandGroupId, commandGroupIds } from "./types.ts";

/** Group ids the previous command palette stored, and where they went. */
const legacyGroups: Readonly<Record<string, CommandGroupId>> = {
  gotoGroup: "navigation",
  settingsGroup: "settings",
  manageGroup: "commands",
  contextualGroup: "commands",
  debugGroup: "commands",
};

export const isCommandGroupId = (value: string): value is CommandGroupId =>
  commandGroupIds.some((id) => id === value);

/**
 * Stored pins → current group ids: legacy ids are mapped, duplicates
 * dropped (first wins) and unknown values ignored.
 */
export const migratePinnedGroups = (
  stored: ReadonlyArray<string>,
): CommandGroupId[] => {
  const result: CommandGroupId[] = [];
  for (const value of stored) {
    const id = isCommandGroupId(value) ? value : legacyGroups[value];
    if (id !== undefined && !result.includes(id)) {
      result.push(id);
    }
  }
  return result;
};

/** Pin or unpin `group`. */
export const togglePinnedGroup = (
  pinned: ReadonlyArray<CommandGroupId>,
  group: CommandGroupId,
): CommandGroupId[] =>
  pinned.includes(group)
    ? pinned.filter((id) => id !== group)
    : [...pinned, group];
