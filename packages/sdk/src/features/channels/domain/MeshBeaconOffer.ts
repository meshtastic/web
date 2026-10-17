import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";

type LoRaConfig = Protobuf.Config.Config_LoRaConfig;
type ChannelSettings = Protobuf.Channel.ChannelSettings;
type MeshBeacon = Protobuf.MeshBeacon.MeshBeacon;

/** A Mesh Beacon invitation heard from another node. */
export interface MeshBeaconOffer {
  readonly from: number;
  readonly rxTime: Date;
  readonly beacon: MeshBeacon;
}

/**
 * How an offer can be joined. "add" puts the channel in a free secondary
 * slot with no reboot; "switch" retunes the radio onto the offered mesh and
 * reboots it; "none" means the beacon offers no channel.
 */
export type BeaconJoinOption = "add" | "switch" | "none";

/**
 * The name firmware hashes for the frequency slot: an empty channel name
 * stands for the modem preset's name.
 */
function effectiveName(
  settings: ChannelSettings | undefined,
  lora: LoRaConfig,
) {
  if (settings?.name) return settings.name;
  const preset =
    Protobuf.Config.Config_LoRaConfig_ModemPreset[lora.modemPreset];
  return (preset ?? "")
    .toLowerCase()
    .replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase());
}

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** A blank secondary slot left behind by a removed channel. */
const isPlaceholder = (s: ChannelSettings) => !s.name && s.psk.length === 0;

/**
 * True when the offered channel is already on the radio: same effective name
 * and key under the preset the offer would run on.
 */
export function isBeaconAlreadyJoined(
  beacon: MeshBeacon,
  lora: LoRaConfig | undefined,
  channels: ReadonlyArray<ChannelSettings>,
): boolean {
  const offer = beacon.offerChannel;
  if (!offer || !lora || channels.length === 0) return false;
  const offerLora = create(Protobuf.Config.Config_LoRaConfigSchema, {
    ...lora,
    usePreset: true,
    modemPreset: beacon.offerPreset ?? lora.modemPreset,
  });
  const offerName = effectiveName(offer, offerLora);
  return channels.some(
    (s, index) =>
      (index === 0 || !isPlaceholder(s)) &&
      effectiveName(s, lora) === offerName &&
      sameBytes(s.psk, offer.psk),
  );
}

/**
 * Decide how to join, after the Android app's beaconJoinOption. Secondary
 * channels ride the primary's frequency slot, so adding only works when the
 * offered mesh is on the same slot under the same preset and region.
 *
 * Android computes both slots from the regional band plan. The web client
 * has no band plan, so it only reports "add" when the slots are certainly
 * equal: the offer advertises the radio's own slot, or both channels hash
 * the same effective name. Anything else is a "switch", which costs a reboot
 * but always works.
 */
export function beaconJoinOption(
  beacon: MeshBeacon,
  lora: LoRaConfig | undefined,
  channels: ReadonlyArray<ChannelSettings>,
): BeaconJoinOption {
  const offer = beacon.offerChannel;
  if (!offer) return "none";
  if (!lora) return "switch";
  const presetMatches =
    beacon.offerPreset === undefined ||
    (lora.usePreset && beacon.offerPreset === lora.modemPreset);
  const regionMatches =
    beacon.offerRegion === Protobuf.Config.Config_LoRaConfig_RegionCode.UNSET ||
    beacon.offerRegion === lora.region;
  if (!presetMatches || !regionMatches) return "switch";

  const advertised = beacon.offerFrequencySlot;
  if (advertised !== undefined && advertised > 0) {
    return lora.channelNum === advertised ? "add" : "switch";
  }
  // A radio pinned to a slot can't be compared with a hashed one.
  if (lora.channelNum !== 0) return "switch";
  return effectiveName(channels[0], lora) === effectiveName(offer, lora)
    ? "add"
    : "switch";
}

/**
 * The ChannelSet to hand the channel import flow. "add" carries only the
 * channel. "switch" also carries a fresh LoRa config (not a copy of the
 * current one, so no stale frequency or slot pin survives) with the offered
 * preset and region. Position sharing is always turned off on the offered
 * channel, so joining a stranger's mesh never shares our location.
 */
export function beaconJoinChannelSet(
  beacon: MeshBeacon,
  option: BeaconJoinOption,
  lora: LoRaConfig | undefined,
): Protobuf.AppOnly.ChannelSet | undefined {
  const offer = beacon.offerChannel;
  if (!offer || option === "none") return undefined;
  const channel = create(Protobuf.Channel.ChannelSettingsSchema, {
    ...offer,
    moduleSettings: create(Protobuf.Channel.ModuleSettingsSchema, {
      isMuted: offer.moduleSettings?.isMuted ?? false,
      positionPrecision: 0,
    }),
  });
  if (option === "add") {
    return create(Protobuf.AppOnly.ChannelSetSchema, { settings: [channel] });
  }
  const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
  return create(Protobuf.AppOnly.ChannelSetSchema, {
    settings: [channel],
    loraConfig: create(Protobuf.Config.Config_LoRaConfigSchema, {
      usePreset: true,
      modemPreset: beacon.offerPreset ?? lora?.modemPreset,
      // A full LoRaConfig replacement with region UNSET would stop transmit.
      region:
        beacon.offerRegion !== Region.UNSET ? beacon.offerRegion : lora?.region,
      hopLimit: 3,
      txEnabled: true,
      channelNum: beacon.offerFrequencySlot ?? 0,
    }),
  });
}
