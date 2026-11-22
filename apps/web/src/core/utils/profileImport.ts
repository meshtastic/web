import { create } from "@bufbuild/protobuf";
import type { ConfigEditor } from "@core/kmp/configEditor.ts";
import { Protobuf } from "@core/protobuf.ts";
import { STAGED_FIXED_POSITION } from "@core/utils/stagedAdminKeys.ts";
import {
  type ImportPlan,
  type ImportTarget,
  PROFILE_MODULE_SECTIONS,
  PROFILE_RADIO_SECTIONS,
  type ProfileModuleSection,
  type ProfileRadioSection,
} from "./profileExport.ts";

/**
 * Applying a device profile import to the config editor, shared by the
 * Settings backup page and the onboarding restore step.
 */

export interface ImportTargetInput {
  readonly owner: Protobuf.Mesh.User | undefined;
  readonly security: Protobuf.Config.Config_SecurityConfig | undefined;
  /** The radio's channel table, any order. */
  readonly channels: Iterable<Protobuf.Channel.Channel>;
}

/** What `planProfileImport` needs to know about the connected node. */
export function importTarget(input: ImportTargetInput): ImportTarget {
  return {
    owner: input.owner,
    security: input.security,
    activeChannelIndexes: [...input.channels]
      .filter((ch) => ch.role !== Protobuf.Channel.Channel_Role.DISABLED)
      .map((ch) => ch.index),
  };
}

/** The editor calls an import plan stages. */
export type ImportStager = Pick<
  ConfigEditor,
  | "setOwner"
  | "setRadioSection"
  | "setModuleSection"
  | "setChannel"
  | "stageAdminMessage"
>;

/** Stages every edit in `plan`; nothing is sent until the editor commits. */
export function stageImportPlan(editor: ImportStager, plan: ImportPlan): void {
  if (plan.owner) editor.setOwner(plan.owner);
  const stageRadio = <K extends ProfileRadioSection>(key: K) => {
    const value = plan.radio[key];
    if (value) editor.setRadioSection(key, value);
  };
  const stageModule = <K extends ProfileModuleSection>(key: K) => {
    const value = plan.modules[key];
    if (value) editor.setModuleSection(key, value);
  };
  for (const key of PROFILE_RADIO_SECTIONS) stageRadio(key);
  for (const key of PROFILE_MODULE_SECTIONS) stageModule(key);
  for (const channel of plan.channels) editor.setChannel(channel);
  if (plan.fixedPosition) {
    // Same key as the Position page, so only one fixed position is sent;
    // Reset drops it and a later edit or import replaces it.
    editor.stageAdminMessage(
      STAGED_FIXED_POSITION,
      create(Protobuf.Admin.AdminMessageSchema, {
        payloadVariant: { case: "setFixedPosition", value: plan.fixedPosition },
      }),
    );
  }
}
