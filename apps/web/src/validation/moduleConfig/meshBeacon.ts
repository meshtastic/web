import { clone, create } from "@bufbuild/protobuf";
import { validateMaxByteLength } from "@core/utils/string.ts";
import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

type MeshBeaconConfig = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig;
type BroadcastTarget =
  Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_BroadcastTarget;
type ChannelSettings = Protobuf.Channel.ChannelSettings;
type LoRaConfig = Protobuf.Config.Config_LoRaConfig;
type ModemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
type RegionCode = Protobuf.Config.Config_LoRaConfig_RegionCode;

const Flags = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_Flags;
const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

/**
 * The flag bits the form edits. Like Android, the legacy-split bit isn't
 * shown, so it is kept as the radio has it, along with any bit this client
 * doesn't know.
 */
const FLAG_MASK = Flags.FLAG_LISTEN_ENABLED | Flags.FLAG_BROADCAST_ENABLED;

/**
 * Firmware 2.8.1 was built from protobufs 8f97d66, where nanopb holds
 * broadcast_message to 101 bytes including the terminator. The vendored
 * protobufs are newer and say 61, but 2.8.1 accepts 100.
 */
export const MESH_BEACON_MESSAGE_MAX_BYTES = 100;
/** The proto documents one hour as both the minimum and the default. */
export const MESH_BEACON_MIN_INTERVAL_SECS = 3600;
const MAX_CHANNEL_INDEX = 7;

/**
 * Form value for "keep the advertised channel as it is": the radio
 * advertises a channel that isn't in its own channel table.
 */
export const OFFER_CHANNEL_KEEP = -2;
/**
 * Form value for a target's "Default" channel or preset, the proto's unset
 * optional: firmware then uses its running preset, or the preset's default
 * channel.
 */
export const TARGET_DEFAULT = -1;

/**
 * Presets a beacon may target when the radio sent no region preset map, as
 * Android's CONSERVATIVE_BEACON_PRESETS: no newer-firmware presets and
 * nothing wider than 250 kHz, so they fit any region's band.
 */
export const CONSERVATIVE_BEACON_PRESETS: readonly ModemPreset[] = [
  Preset.LONG_FAST,
  Preset.LONG_MODERATE,
  Preset.MEDIUM_SLOW,
  Preset.MEDIUM_FAST,
  Preset.SHORT_SLOW,
  Preset.SHORT_FAST,
];

const channelIndex = z.coerce.number().int().min(0).max(MAX_CHANNEL_INDEX);

const BroadcastTargetSchema = z.object({
  channelIndex: z.union([z.literal(TARGET_DEFAULT), channelIndex]),
  preset: z.union([z.literal(TARGET_DEFAULT), z.enum(Preset)]),
});

export const MeshBeaconValidationSchema = z.object({
  /** Read-only: the beacon always uses the radio's own region. */
  region: z.enum(Region),
  listenEnabled: z.boolean(),
  broadcastEnabled: z.boolean(),
  broadcastMessage: z
    .string()
    .refine(
      (s) => validateMaxByteLength(s, MESH_BEACON_MESSAGE_MAX_BYTES).isValid,
      {
        message: "formValidation.tooBig.bytes",
        params: { maximum: MESH_BEACON_MESSAGE_MAX_BYTES },
      },
    ),
  broadcastIntervalSecs: z.coerce
    .number()
    .int()
    .min(MESH_BEACON_MIN_INTERVAL_SECS),
  offerChannel: z.union([z.literal(OFFER_CHANNEL_KEEP), channelIndex]),
  broadcastTargets: z.array(BroadcastTargetSchema).min(1),
});

export type MeshBeaconValidation = z.infer<typeof MeshBeaconValidationSchema>;
export type MeshBeaconTargetValidation = z.infer<typeof BroadcastTargetSchema>;

export const DEFAULT_TARGET: MeshBeaconTargetValidation = {
  channelIndex: TARGET_DEFAULT,
  preset: TARGET_DEFAULT,
};

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The local channel the advertised channel was copied from, matched on
 * name and key. An unset offer shows the primary, which is what a save
 * fills in. One that isn't ours is OFFER_CHANNEL_KEEP.
 */
function offerChannelIndex(
  offer: ChannelSettings | undefined,
  channels: ReadonlyArray<ChannelSettings | undefined>,
): number {
  if (!offer) return 0;
  const index = channels.findIndex(
    (c) =>
      c !== undefined && c.name === offer.name && sameBytes(c.psk, offer.psk),
  );
  return index === -1 ? OFFER_CHANNEL_KEEP : index;
}

/**
 * The form's view of the config. `channels` is indexed by channel index,
 * with undefined for disabled slots.
 *
 * Like Android, an empty target list shows as one "Default" row: firmware
 * sends a single beacon on its running settings when the list is empty, and
 * the row makes that visible.
 */
export function toMeshBeaconForm(
  config: MeshBeaconConfig | undefined,
  channels: ReadonlyArray<ChannelSettings | undefined>,
  lora: LoRaConfig | undefined,
): MeshBeaconValidation {
  const flags = config?.flags ?? 0;
  const targets = config?.broadcastTargets ?? [];
  return {
    region: lora?.region ?? Region.UNSET,
    listenEnabled: (flags & Flags.FLAG_LISTEN_ENABLED) !== 0,
    broadcastEnabled: (flags & Flags.FLAG_BROADCAST_ENABLED) !== 0,
    broadcastMessage: config?.broadcastMessage ?? "",
    // 0 is the proto3 default for a radio that never set it; show the
    // documented default instead of a value the schema rejects.
    broadcastIntervalSecs:
      config?.broadcastIntervalSecs || MESH_BEACON_MIN_INTERVAL_SECS,
    offerChannel: offerChannelIndex(config?.broadcastOfferChannel, channels),
    broadcastTargets:
      targets.length > 0
        ? targets.map((target) => ({
            channelIndex: target.channelIndex ?? TARGET_DEFAULT,
            preset: target.preset ?? TARGET_DEFAULT,
          }))
        : [{ ...DEFAULT_TARGET }],
  };
}

const isDefaultTarget = (target: MeshBeaconTargetValidation) =>
  target.channelIndex === TARGET_DEFAULT && target.preset === TARGET_DEFAULT;

/**
 * Merge the form back onto the config, applying Android's save rules
 * (MeshBeaconConfigPolicy.stampBeaconConfigForSave).
 *
 * On a standard modem preset, the beacon advertises the radio's own region
 * and preset, never a user's choice, and every target uses the radio's
 * region. An untouched offered channel becomes the primary; only its name
 * and key are sent. A target row the user didn't change keeps the stored
 * target, fields this form doesn't show included. The "Default" row shown
 * for an empty list stays an empty list: firmware then sends one beacon on
 * the primary channel, while a saved Default target would use the preset's
 * default channel.
 *
 * On custom LoRa settings a preset means nothing, so only the listen and
 * broadcast flags come from the form and every broadcast field stays as the
 * radio has it.
 *
 * Unlike Android, the frequency slots are never sent: firmware 2.8.1 doesn't
 * know them. Flag bits the form doesn't own are kept.
 *
 * `stored` is the radio's own config, which target rows are compared with;
 * it defaults to `base`, the config being edited.
 */
export function fromMeshBeaconForm(
  form: MeshBeaconValidation,
  base: MeshBeaconConfig | undefined,
  channels: ReadonlyArray<ChannelSettings | undefined>,
  lora: LoRaConfig | undefined,
  stored: MeshBeaconConfig | undefined = base,
): MeshBeaconConfig {
  const Schema = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfigSchema;
  const config = base ? clone(Schema, base) : create(Schema);
  const bits =
    (form.listenEnabled ? Flags.FLAG_LISTEN_ENABLED : 0) |
    (form.broadcastEnabled ? Flags.FLAG_BROADCAST_ENABLED : 0);
  config.flags = (config.flags & ~FLAG_MASK) | bits;

  if (!lora?.usePreset) return config;

  config.broadcastMessage = form.broadcastMessage;
  config.broadcastIntervalSecs = form.broadcastIntervalSecs;
  config.broadcastOfferChannel = offerChannel(
    form.offerChannel,
    base,
    channels,
  );
  config.broadcastOfferRegion = lora.region;
  config.broadcastOfferPreset = lora.modemPreset;
  // Added to the schema after firmware 2.8.1, which doesn't know it.
  config.broadcastOfferFrequencySlot = undefined;

  const storedTargets = stored?.broadcastTargets ?? [];
  const [only] = form.broadcastTargets;
  config.broadcastTargets =
    storedTargets.length === 0 &&
    form.broadcastTargets.length === 1 &&
    only &&
    isDefaultTarget(only)
      ? []
      : form.broadcastTargets.map((target, index) =>
          toTarget(target, storedTargets[index], lora.region),
        );
  return config;
}

function offerChannel(
  choice: number,
  base: MeshBeaconConfig | undefined,
  channels: ReadonlyArray<ChannelSettings | undefined>,
): ChannelSettings | undefined {
  if (choice === OFFER_CHANNEL_KEEP) return base?.broadcastOfferChannel;
  const source = channels[choice] ?? channels[0];
  if (!source) return base?.broadcastOfferChannel;
  return create(Protobuf.Channel.ChannelSettingsSchema, {
    name: source.name,
    psk: source.psk,
  });
}

function toTarget(
  target: MeshBeaconTargetValidation,
  stored: BroadcastTarget | undefined,
  region: RegionCode,
): BroadcastTarget {
  const TargetSchema =
    Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_BroadcastTargetSchema;
  if (
    stored &&
    (stored.channelIndex ?? TARGET_DEFAULT) === target.channelIndex &&
    (stored.preset ?? TARGET_DEFAULT) === target.preset
  ) {
    const kept = clone(TargetSchema, stored);
    kept.region = region;
    return kept;
  }
  return create(
    Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_BroadcastTargetSchema,
    {
      region,
      channelIndex:
        target.channelIndex === TARGET_DEFAULT
          ? undefined
          : target.channelIndex,
      preset: target.preset === TARGET_DEFAULT ? undefined : target.preset,
    },
  );
}

/**
 * A channel pick on a target row (Android's selectBeaconTargetChannel): the
 * first time a row gets a real channel, preselect the radio's preset, but
 * never replace a preset the user chose.
 */
export function selectTargetChannel(
  target: MeshBeaconTargetValidation,
  channelIndex: number,
  currentPreset: ModemPreset | undefined,
): MeshBeaconTargetValidation {
  const preset =
    channelIndex !== TARGET_DEFAULT &&
    target.preset === TARGET_DEFAULT &&
    currentPreset !== undefined
      ? currentPreset
      : target.preset;
  return { channelIndex, preset };
}

/**
 * Whether the broadcast half of the editor shows and can be edited
 * (Android's beaconBroadcastGate). It shows on a standard preset, or while
 * the radio is still broadcasting so it can be turned off, and is editable
 * only on a standard preset.
 */
export function beaconBroadcastGate(
  usePreset: boolean,
  storedBroadcastEnabled: boolean,
): {
  sectionsVisible: boolean;
  sectionsEnabled: boolean;
  toggleEnabled: boolean;
} {
  const visible = usePreset || storedBroadcastEnabled;
  return {
    sectionsVisible: visible,
    sectionsEnabled: usePreset,
    toggleEnabled: visible,
  };
}
