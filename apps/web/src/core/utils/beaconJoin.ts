import { create, toBinary } from "@bufbuild/protobuf";
import { channelSetToUrl } from "@core/utils/channelUrl.ts";
import {
  type BeaconJoinOption,
  beaconJoinChannelSet,
  beaconJoinOption,
  type Channel,
  isBeaconAlreadyJoined,
  type MeshBeaconOffer,
  Protobuf,
} from "@meshtastic/sdk";

type ChannelSettings = Protobuf.Channel.ChannelSettings;

const MAX_CHANNELS = 8;

/**
 * Channel settings indexed by channel index, undefined for a disabled or
 * missing slot. The SDK beacon helpers read array position 0 as the
 * primary, so the list must be in index order with no gaps.
 */
export function channelSettingsByIndex(
  channels: ReadonlyArray<Channel>,
): Array<ChannelSettings | undefined> {
  const byIndex: Array<ChannelSettings | undefined> = Array.from({
    length: MAX_CHANNELS,
  });
  for (const channel of channels) {
    if (channel.index < 0 || channel.index >= MAX_CHANNELS) continue;
    if (channel.role === Protobuf.Channel.Channel_Role.DISABLED) continue;
    byIndex[channel.index] = channel.settings;
  }
  return byIndex;
}

/** The first secondary slot holding no channel, or undefined if all are used. */
export function firstFreeSecondarySlot(
  channels: ReadonlyArray<ChannelSettings | undefined>,
): number | undefined {
  for (let index = 1; index < MAX_CHANNELS; index++) {
    const s = channels[index];
    if (!s || (!s.name && s.psk.length === 0)) return index;
  }
  return undefined;
}

/** What joining an offer would do, ready for the channel import dialog. */
export interface BeaconJoinPlan {
  readonly from: number;
  readonly option: Exclude<BeaconJoinOption, "none">;
  /** Channel share URL the import dialog parses. */
  readonly url: string;
  /**
   * Slot for each channel in the URL. A "switch" puts the offered channel
   * on the primary; an "add" puts it in the first free secondary slot, or
   * -1 (don't import) when there is none, so the user has to pick one.
   */
  readonly indices: number[];
  /** True for an "add" with every secondary slot already in use. */
  readonly noFreeSlot: boolean;
}

/**
 * Plan a join, or undefined when the offer carries no channel or the radio
 * is already on the offered channel.
 */
export function planBeaconJoin(
  offer: MeshBeaconOffer,
  lora: Protobuf.Config.Config_LoRaConfig | undefined,
  channels: ReadonlyArray<ChannelSettings | undefined>,
): BeaconJoinPlan | undefined {
  const settings = channels.map(
    (s) => s ?? create(Protobuf.Channel.ChannelSettingsSchema),
  );
  if (isBeaconAlreadyJoined(offer.beacon, lora, settings)) return undefined;
  const option = beaconJoinOption(offer.beacon, lora, settings);
  if (option === "none") return undefined;
  const channelSet = beaconJoinChannelSet(offer.beacon, option, lora);
  if (!channelSet) return undefined;

  const slot = option === "switch" ? 0 : firstFreeSecondarySlot(channels);
  return {
    from: offer.from,
    option,
    url: channelSetToUrl(channelSet),
    indices: [slot ?? -1],
    noFreeSlot: slot === undefined,
  };
}

/**
 * Identifies an offer by sender and content, so the hourly rebroadcast of
 * the same invitation counts as the same offer.
 */
export function beaconOfferKey(offer: MeshBeaconOffer): string {
  const bytes = toBinary(Protobuf.MeshBeacon.MeshBeaconSchema, offer.beacon);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return `${offer.from}:${hex}`;
}
