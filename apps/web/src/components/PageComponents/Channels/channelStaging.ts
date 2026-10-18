import {
  POSITION_PRECISION_MAX,
  POSITION_PRECISION_MIN,
  POSITION_PRECISION_OFF,
  POSITION_PRECISION_PRECISE,
} from "@app/validation/channel.ts";
import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fromByteArray, toByteArray } from "base64-js";

/** The firmware supports 8 channels: index 0 (primary) and 1-7. */
export const MAX_CHANNELS = 8;

/** Precision used when "Precise location" is switched off (as on Android). */
export const POSITION_PRECISION_DEFAULT = 13;

/** The well-known 1 byte default key (0x01), as base64. */
export const DEFAULT_PSK = "AQ==";

const Role = Protobuf.Channel.Channel_Role;

type ChannelLike = Pick<Protobuf.Channel.Channel, "index" | "role"> & {
  settings?: Protobuf.Channel.ChannelSettings;
};

/** What the edit dialog lets the user change. */
export interface ChannelDraft {
  /** As typed; trimmed when the channel is built. */
  name: string;
  /** Base64. */
  psk: string;
  uplinkEnabled: boolean;
  downlinkEnabled: boolean;
  positionPrecision: number;
}

/** Android's ChannelPskEditState: when naming a channel may generate a PSK. */
export interface PskEditState {
  /** Only set for channels added with "Add channel". */
  canGeneratePskForName: boolean;
  /** The current PSK was generated because the channel was named. */
  generatedPskForName: boolean;
  /** The user typed or generated a PSK themselves. */
  pskExplicitlyEdited: boolean;
  /** The PSK to restore if the generated one is undone. */
  pskBeforeGenerated?: string;
}

export const EXISTING_CHANNEL_PSK_STATE: PskEditState = {
  canGeneratePskForName: false,
  generatedPskForName: false,
  pskExplicitlyEdited: false,
};

export const NEW_CHANNEL_PSK_STATE: PskEditState = {
  ...EXISTING_CHANNEL_PSK_STATE,
  canGeneratePskForName: true,
};

/** A random 256 bit key, as base64. */
export function generatePsk(bytes = 32): string {
  return fromByteArray(crypto.getRandomValues(new Uint8Array(bytes)));
}

/**
 * Bring a device value into what the dialog can show: 0 (off), 10-19 or 32
 * (precise).
 */
export function normalizePositionPrecision(value: number | undefined): number {
  if (!value || value <= POSITION_PRECISION_OFF) return POSITION_PRECISION_OFF;
  if (value >= POSITION_PRECISION_PRECISE) return POSITION_PRECISION_PRECISE;
  return Math.min(
    POSITION_PRECISION_MAX,
    Math.max(POSITION_PRECISION_MIN, value),
  );
}

export function draftFromChannel(channel: ChannelLike): ChannelDraft {
  const settings = channel.settings;
  return {
    name: settings?.name ?? "",
    psk: fromByteArray(settings?.psk ?? new Uint8Array(0)),
    uplinkEnabled: settings?.uplinkEnabled ?? false,
    downlinkEnabled: settings?.downlinkEnabled ?? false,
    positionPrecision: normalizePositionPrecision(
      settings?.moduleSettings?.positionPrecision,
    ),
  };
}

/**
 * The channel to stage after the dialog's OK. Starts from the existing channel
 * and settings so fields the dialog doesn't render (role, id, channelNum,
 * useAead, moduleSettings.isMuted, ...) keep their values. Saving without
 * changes gives a channel equal to the original.
 */
export function buildEditedChannel(
  existing: ChannelLike,
  draft: ChannelDraft,
): Protobuf.Channel.Channel {
  const settings = existing.settings;
  const moduleSettings = settings?.moduleSettings;
  const existingPrecision = moduleSettings?.positionPrecision ?? 0;
  // The dialog rounds precision into its 10-19 range; keep a device value
  // outside it (set by another client) unless the user changed it.
  const precision =
    draft.positionPrecision === normalizePositionPrecision(existingPrecision)
      ? existingPrecision
      : draft.positionPrecision;
  const keepModuleSettings =
    moduleSettings !== undefined || precision !== POSITION_PRECISION_OFF;

  const base: Protobuf.Channel.ChannelSettings =
    settings ?? create(Protobuf.Channel.ChannelSettingsSchema);
  // Spread the existing messages: create() returns a message as it is, so
  // every field the dialog doesn't touch (and any unknown field) is kept.
  const nextSettings: Protobuf.Channel.ChannelSettings = {
    ...base,
    name: draft.name.trim(),
    psk: toByteArray(draft.psk),
    uplinkEnabled: draft.uplinkEnabled,
    downlinkEnabled: draft.downlinkEnabled,
    // Only add the key when needed: the editor counts keys when it checks
    // whether a channel changed.
    ...(keepModuleSettings && {
      moduleSettings: {
        ...(moduleSettings ?? create(Protobuf.Channel.ModuleSettingsSchema)),
        positionPrecision: precision,
      },
    }),
  };

  return create(Protobuf.Channel.ChannelSchema, {
    index: existing.index,
    role: existing.role,
    settings: nextSettings,
  });
}

/** What "Delete" stages: the slot is disabled and its settings cleared. */
export function buildDisabledChannel(index: number): Protobuf.Channel.Channel {
  return create(Protobuf.Channel.ChannelSchema, {
    index,
    role: Role.DISABLED,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, {}),
  });
}

/** A new secondary channel for a free slot, with the given base64 PSK. */
export function buildNewChannel(
  index: number,
  psk: string,
): Protobuf.Channel.Channel {
  return create(Protobuf.Channel.ChannelSchema, {
    index,
    role: Role.SECONDARY,
    settings: create(Protobuf.Channel.ChannelSettingsSchema, {
      psk: toByteArray(psk),
      moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
        positionPrecision: POSITION_PRECISION_OFF,
      }),
    }),
  });
}

/** Channels that are in use (not DISABLED), by index. */
export function enabledChannels<T extends ChannelLike>(
  channels: Iterable<T>,
): T[] {
  return [...channels]
    .filter((c) => c.role !== Role.DISABLED)
    .sort((a, b) => a.index - b.index);
}

/**
 * The slot "Add channel" uses: the first secondary index (1-7) that is
 * DISABLED or not known yet. Undefined when all 8 are in use.
 */
export function firstFreeIndex(
  channels: ReadonlyMap<number, ChannelLike>,
): number | undefined {
  for (let index = 1; index < MAX_CHANNELS; index++) {
    const channel = channels.get(index);
    if (!channel || channel.role === Role.DISABLED) return index;
  }
  return undefined;
}

/**
 * The index of the channel that broadcasts position periodically, or -1.
 * Firmware 2.6.10+ uses the first enabled channel with position on; older
 * firmware only the primary.
 */
export function locationSharingIndex(
  channels: Iterable<ChannelLike>,
  supportsSecondaryChannelLocation: boolean,
): number {
  const enabled = enabledChannels(channels);
  const sharing = (c: ChannelLike) =>
    (c.settings?.moduleSettings?.positionPrecision ?? 0) > 0;
  if (supportsSecondaryChannelLocation) {
    return enabled.find(sharing)?.index ?? -1;
  }
  const primary = enabled.find((c) => c.index === 0);
  return primary && sharing(primary) ? 0 : -1;
}

export type SecurityState =
  | "secure"
  | "insecureNoPrecise"
  | "insecurePreciseOnly"
  | "insecurePreciseMqtt";

/** Android's SecurityIcon: a PSK of 0 or 1 byte is not secure. */
export function securityState(
  settings: Protobuf.Channel.ChannelSettings | undefined,
): SecurityState {
  const lowEntropy = (settings?.psk.length ?? 0) <= 1;
  if (!lowEntropy) return "secure";
  const precise =
    settings?.moduleSettings?.positionPrecision === POSITION_PRECISION_PRECISE;
  if (precise && settings?.uplinkEnabled) return "insecurePreciseMqtt";
  if (precise) return "insecurePreciseOnly";
  return "insecureNoPrecise";
}

/**
 * Port of Android's applyChannelNameEdit. Naming a newly added channel that
 * still has the default (or an empty) PSK generates a key, unless the user
 * set the PSK themselves. Clearing the name again restores the old key.
 */
export function applyChannelNameEdit(
  draft: ChannelDraft,
  nameInput: string,
  state: PskEditState,
  randomKey: () => string = generatePsk,
): { draft: ChannelDraft; state: PskEditState } {
  const name = nameInput.trim();
  const clearGenerated =
    name === "" && state.generatedPskForName && !state.pskExplicitlyEdited;
  const generateForName =
    name !== "" &&
    (draft.psk === DEFAULT_PSK || draft.psk === "") &&
    state.canGeneratePskForName &&
    !state.pskExplicitlyEdited;

  if (clearGenerated) {
    return {
      draft: {
        ...draft,
        name: nameInput,
        psk: state.pskBeforeGenerated ?? DEFAULT_PSK,
      },
      state: {
        ...state,
        generatedPskForName: false,
        pskBeforeGenerated: undefined,
      },
    };
  }
  if (generateForName) {
    return {
      draft: { ...draft, name: nameInput, psk: randomKey() },
      state: {
        ...state,
        generatedPskForName: true,
        pskBeforeGenerated: draft.psk,
      },
    };
  }
  return { draft: { ...draft, name: nameInput }, state };
}

/** The user typed or generated a PSK: stop generating one for the name. */
export function markPskEdited(state: PskEditState): PskEditState {
  return {
    ...state,
    generatedPskForName: false,
    pskExplicitlyEdited: true,
    pskBeforeGenerated: undefined,
  };
}

/** Byte length of a base64 PSK, or undefined if it isn't valid base64. */
export function pskByteLength(psk: string): number | undefined {
  try {
    return toByteArray(psk).byteLength;
  } catch {
    return undefined;
  }
}

const METRIC_PRECISION_KEYS = [
  "metric_km23",
  "metric_km12",
  "metric_km5_8",
  "metric_km2_9",
  "metric_km1_5",
  "metric_m700",
  "metric_m350",
  "metric_m200",
  "metric_m90",
  "metric_m50",
] as const;

const IMPERIAL_PRECISION_KEYS = [
  "imperial_mi15",
  "imperial_mi7_3",
  "imperial_mi3_6",
  "imperial_mi1_8",
  "imperial_mi0_9",
  "imperial_mi0_5",
  "imperial_mi0_2",
  "imperial_ft600",
  "imperial_ft300",
  "imperial_ft150",
] as const;

/**
 * The i18n key (channels namespace) describing how close a position with this
 * precision (10-19) is, e.g. "Within 2.9 kilometers".
 */
export function precisionLabelKey(precision: number, metric: boolean): string {
  const keys = metric ? METRIC_PRECISION_KEYS : IMPERIAL_PRECISION_KEYS;
  const clamped = Math.min(
    POSITION_PRECISION_MAX,
    Math.max(POSITION_PRECISION_MIN, precision),
  );
  return `positionPrecision.options.${keys[clamped - POSITION_PRECISION_MIN]}`;
}
