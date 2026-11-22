import { create } from "@bufbuild/protobuf";
import { mergeLinkLora } from "@core/channels/loraMerge.ts";
import type { ConnectionStatus } from "@core/stores/deviceStore/types.ts";
import { Protobuf } from "@core/protobuf.ts";
import { Result } from "better-result";
import type { ChannelImportPlan } from "./channelImport.ts";

type User = Protobuf.Mesh.User;
type LoRa = Protobuf.Config.Config_LoRaConfig;
type RegionCode = Protobuf.Config.Config_LoRaConfig_RegionCode;
type ModemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
type Channel = Protobuf.Channel.Channel;
type ChannelSet = Protobuf.AppOnly.ChannelSet;

const Role = Protobuf.Channel.Channel_Role;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

/**
 * Saving LoRa settings needs the radio's whole current LoRa section: the
 * editor merges over it, and without it fields like tx_enabled and
 * hop_limit would go out as zero and the radio would stop transmitting.
 */
export type SaveBuildError = "loraNotLoaded";

export interface ProfileEdits {
  /** The new owner, when a name changed. */
  readonly owner?: User;
  /** The full LoRa section, when the region changed. */
  readonly lora?: LoRa;
  /** A LoRa change restarts the radio. */
  readonly restartExpected: boolean;
}

export interface ProfileEditInput {
  readonly user: User | undefined;
  readonly longName: string;
  readonly shortName: string;
  readonly currentLora: LoRa | undefined;
  /** The region picked on the form, if any. */
  readonly region: RegionCode | undefined;
  /** The firmware's default preset for `region`, when it says. */
  readonly defaultPreset: ModemPreset | undefined;
}

/** What the profile step stages: trimmed names, and the region over the current LoRa section. */
export function buildProfileEdits(
  input: ProfileEditInput,
): Result<ProfileEdits, SaveBuildError> {
  const longName = input.longName.trim();
  const shortName = input.shortName.trim();
  const baseline = input.user ?? create(Protobuf.Mesh.UserSchema, {});
  const owner =
    longName !== baseline.longName || shortName !== baseline.shortName
      ? create(Protobuf.Mesh.UserSchema, { ...baseline, longName, shortName })
      : undefined;

  const regionChanges =
    input.region !== undefined && input.region !== input.currentLora?.region;
  if (!regionChanges || input.region === undefined) {
    return Result.ok({ owner, restartExpected: false });
  }
  if (input.currentLora === undefined) return Result.err("loraNotLoaded");
  const lora: LoRa = {
    ...input.currentLora,
    region: input.region,
    modemPreset: input.defaultPreset ?? input.currentLora.modemPreset,
  };
  return Result.ok({ owner, lora, restartExpected: true });
}

export interface ChannelEdits {
  readonly channels: ReadonlyArray<Channel>;
  readonly lora?: LoRa;
  readonly restartExpected: boolean;
}

/** The channel messages (and LoRa section, for a replace) a plan stages. */
export function buildChannelEdits(
  link: ChannelSet,
  plan: ChannelImportPlan,
  currentLora: LoRa | undefined,
): Result<ChannelEdits, SaveBuildError> {
  const channels: Channel[] = [
    ...plan.assignments.map((assignment) =>
      create(Protobuf.Channel.ChannelSchema, {
        index: assignment.slot,
        role: assignment.role === "primary" ? Role.PRIMARY : Role.SECONDARY,
        settings: link.settings[assignment.from],
      }),
    ),
    ...plan.disable.map((slot) =>
      create(Protobuf.Channel.ChannelSchema, {
        index: slot,
        role: Role.DISABLED,
        settings: create(Protobuf.Channel.ChannelSettingsSchema),
      }),
    ),
  ];
  if (!plan.applyLora || link.loraConfig === undefined) {
    return Result.ok({ channels, restartExpected: false });
  }
  if (currentLora === undefined) return Result.err("loraNotLoaded");
  return Result.ok({
    channels,
    lora: mergeLinkLora(currentLora, link.loraConfig),
    restartExpected: true,
  });
}

export interface RegionChange {
  readonly from: string;
  readonly to: string;
}

/** The region change a replace would make, if it makes one. */
export function replaceRegionChange(
  currentLora: LoRa | undefined,
  link: ChannelSet,
): RegionChange | undefined {
  const to = link.loraConfig?.region;
  if (to === undefined || to === Region.UNSET) return undefined;
  const from = currentLora?.region ?? Region.UNSET;
  if (from === to) return undefined;
  return {
    from: Region[from] ?? String(from),
    to: Region[to] ?? String(to),
  };
}

/** Mirrors the error ConfigEditor returns when a disconnect interrupts a commit. */
export const COMMIT_DISCONNECTED_MESSAGE =
  "The device disconnected before the commit finished";

export type SaveOutcome = "saved" | "savedRestarting" | "failed";

/**
 * How a commit went. A LoRa change makes the radio restart, which can drop
 * the connection before the commit's acknowledgement arrives: that error
 * (or the connection leaving `configured`) means the save went out and the
 * radio is restarting, not that it failed.
 */
export function classifyCommit(
  result: Result<void, Error>,
  context: {
    readonly restartExpected: boolean;
    readonly statusAfter: ConnectionStatus | undefined;
  },
): SaveOutcome {
  if (Result.isOk(result)) {
    return context.restartExpected ? "savedRestarting" : "saved";
  }
  if (
    context.restartExpected &&
    (result.error.message === COMMIT_DISCONNECTED_MESSAGE ||
      context.statusAfter !== "configured")
  ) {
    return "savedRestarting";
  }
  return "failed";
}
