import { Protobuf } from "@core/protobuf.ts";
import {
  type ImportPlan,
  type ImportSkip,
  type ImportTarget,
  planProfileImport,
  type ProfileFieldRow,
  profileFieldRows,
  type ProfileImportError,
  type ProfileSelection,
  selectProfileFields,
} from "@core/utils/profileExport.ts";
import type { Result } from "better-result";
import type { SaveOutcome } from "./saves.ts";

/**
 * The onboarding restore step: what a backup file holds, what restoring it
 * stages, and where the wizard goes afterwards. The plan is the same one
 * the Settings backup page stages, applied in full: the file's LoRa
 * settings replace the radio's, region included.
 */

type DeviceProfile = Protobuf.ClientOnly.DeviceProfile;
type LoRa = Protobuf.Config.Config_LoRaConfig;

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

/** The selected parts of `profile` as editor changes for `target`. */
export const planRestore = (
  profile: DeviceProfile,
  selection: ProfileSelection,
  target: ImportTarget,
): Result<ImportPlan, ProfileImportError> =>
  planProfileImport(selectProfileFields(profile, selection), target);

/**
 * The rows the step lists: only what the file holds, and only what a
 * restore can apply. Parts that are never applied show as notes instead.
 */
export const restoreRows = (
  available: ProfileSelection,
  selection: ProfileSelection,
): ProfileFieldRow[] =>
  profileFieldRows("import", available, selection).filter(
    (row) => row.available && !row.notApplied,
  );

/** A part of the file that won't be applied, or is kept from the radio. */
export type RestoreNote = ImportSkip | "keysKept";

/**
 * What the restore leaves alone: the plan's skipped parts, and the radio's
 * own key pair when the file's security settings go in without a key.
 */
export function restoreNotes(
  profile: DeviceProfile,
  selection: ProfileSelection,
  plan: ImportPlan,
): RestoreNote[] {
  const notes: RestoreNote[] = [...new Set(plan.skipped)];
  const fileKey = (profile.config?.security?.privateKey.length ?? 0) > 0;
  const keysKept =
    selection.config &&
    profile.config?.security !== undefined &&
    !(selection.privateKey && fileKey) &&
    !plan.skipped.includes("security");
  return keysKept ? [...notes, "keysKept"] : notes;
}

/**
 * Writing radio or module settings restarts the radio once the commit
 * lands; names, channels and a fixed position alone don't.
 */
export const restoreRestarts = (plan: ImportPlan): boolean =>
  Object.keys(plan.radio).length > 0 || Object.keys(plan.modules).length > 0;

/** Whether the radio still has no LoRa region once the plan is written. */
export function regionUnsetAfter(
  plan: ImportPlan,
  currentLora: LoRa | undefined,
): boolean {
  const region = plan.radio.lora?.region ?? currentLora?.region;
  return region === undefined || region === Region.UNSET;
}

export type RestoreNotice =
  | "restore.saved"
  | "restore.savedRestarting"
  | "restore.savedNoRegion";

/** The note shown on the step a successful restore leads to. */
export function restoreNotice(
  outcome: Exclude<SaveOutcome, "failed">,
  regionUnset: boolean,
): RestoreNotice {
  if (regionUnset) return "restore.savedNoRegion";
  return outcome === "savedRestarting"
    ? "restore.savedRestarting"
    : "restore.saved";
}
