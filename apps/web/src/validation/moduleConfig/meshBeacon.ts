import { clone, create } from "@bufbuild/protobuf";
import { validateMaxByteLength } from "@core/utils/string.ts";
import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

type MeshBeaconConfig = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig;
type ChannelSettings = Protobuf.Channel.ChannelSettings;

const Flags = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_Flags;
const FLAG_MASK =
  Flags.FLAG_LISTEN_ENABLED |
  Flags.FLAG_BROADCAST_ENABLED |
  Flags.FLAG_LEGACY_SPLIT;

/**
 * Firmware 2.8.1 was built from protobufs 8f97d66, where nanopb holds
 * broadcast_message to 101 bytes including the terminator. The vendored
 * protobufs are newer and say 61, but 2.8.1 accepts 100.
 */
export const MESH_BEACON_MESSAGE_MAX_BYTES = 100;
/** The proto documents one hour as both the minimum and the default. */
export const MESH_BEACON_MIN_INTERVAL_SECS = 3600;

/** Form value for "advertise no channel". */
export const OFFER_CHANNEL_NONE = -1;
/**
 * Form value for "keep the advertised channel as it is": the radio
 * advertises a channel that isn't in its own channel table.
 */
export const OFFER_CHANNEL_KEEP = -2;
/** Form value for "no preset advertised", the proto's unset optional. */
export const OFFER_PRESET_UNSET = -1;

export const MeshBeaconValidationSchema = z.object({
  listenEnabled: z.boolean(),
  broadcastEnabled: z.boolean(),
  legacySplit: z.boolean(),
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
  offerChannel: z.coerce.number().int().min(OFFER_CHANNEL_KEEP).max(7),
  broadcastOfferRegion: z.enum(Protobuf.Config.Config_LoRaConfig_RegionCode),
  broadcastOfferPreset: z.union([
    z.literal(OFFER_PRESET_UNSET),
    z.enum(Protobuf.Config.Config_LoRaConfig_ModemPreset),
  ]),
});

export type MeshBeaconValidation = z.infer<typeof MeshBeaconValidationSchema>;

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The local channel the advertised channel was copied from, matched on
 * name and key, or OFFER_CHANNEL_KEEP when it isn't one of ours.
 */
function offerChannelIndex(
  offer: ChannelSettings | undefined,
  channels: ReadonlyArray<ChannelSettings | undefined>,
): number {
  if (!offer) return OFFER_CHANNEL_NONE;
  const index = channels.findIndex(
    (c) =>
      c !== undefined && c.name === offer.name && sameBytes(c.psk, offer.psk),
  );
  return index === -1 ? OFFER_CHANNEL_KEEP : index;
}

/**
 * The form's view of the config. `channels` is indexed by channel index,
 * with undefined for disabled slots.
 */
export function toMeshBeaconForm(
  config: MeshBeaconConfig | undefined,
  channels: ReadonlyArray<ChannelSettings | undefined>,
): MeshBeaconValidation {
  const flags = config?.flags ?? 0;
  return {
    listenEnabled: (flags & Flags.FLAG_LISTEN_ENABLED) !== 0,
    broadcastEnabled: (flags & Flags.FLAG_BROADCAST_ENABLED) !== 0,
    legacySplit: (flags & Flags.FLAG_LEGACY_SPLIT) !== 0,
    broadcastMessage: config?.broadcastMessage ?? "",
    // 0 is the proto3 default for a radio that never set it; show the
    // documented default instead of a value the schema rejects.
    broadcastIntervalSecs:
      config?.broadcastIntervalSecs || MESH_BEACON_MIN_INTERVAL_SECS,
    offerChannel: offerChannelIndex(config?.broadcastOfferChannel, channels),
    broadcastOfferRegion:
      config?.broadcastOfferRegion ??
      Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET,
    broadcastOfferPreset: config?.broadcastOfferPreset ?? OFFER_PRESET_UNSET,
  };
}

/**
 * Merge the form back onto the config. Fields the form doesn't show
 * (broadcast targets, flag bits it doesn't know) are kept as they are.
 * The advertised channel carries only the name and key a listener needs.
 */
export function fromMeshBeaconForm(
  form: MeshBeaconValidation,
  base: MeshBeaconConfig | undefined,
  channels: ReadonlyArray<ChannelSettings | undefined>,
): MeshBeaconConfig {
  const bits =
    (form.listenEnabled ? Flags.FLAG_LISTEN_ENABLED : 0) |
    (form.broadcastEnabled ? Flags.FLAG_BROADCAST_ENABLED : 0) |
    (form.legacySplit ? Flags.FLAG_LEGACY_SPLIT : 0);

  let broadcastOfferChannel: ChannelSettings | undefined;
  if (form.offerChannel === OFFER_CHANNEL_KEEP) {
    broadcastOfferChannel = base?.broadcastOfferChannel;
  } else if (form.offerChannel !== OFFER_CHANNEL_NONE) {
    const source = channels[form.offerChannel];
    broadcastOfferChannel = source
      ? create(Protobuf.Channel.ChannelSettingsSchema, {
          name: source.name,
          psk: source.psk,
        })
      : undefined;
  }

  const Schema = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfigSchema;
  const config = base ? clone(Schema, base) : create(Schema);
  config.flags = (config.flags & ~FLAG_MASK) | bits;
  config.broadcastMessage = form.broadcastMessage;
  config.broadcastIntervalSecs = form.broadcastIntervalSecs;
  config.broadcastOfferChannel = broadcastOfferChannel;
  config.broadcastOfferRegion = form.broadcastOfferRegion;
  config.broadcastOfferPreset =
    form.broadcastOfferPreset === OFFER_PRESET_UNSET
      ? undefined
      : form.broadcastOfferPreset;
  // Added to the schema after firmware 2.8.1, which doesn't know it.
  config.broadcastOfferFrequencySlot = undefined;
  return config;
}
