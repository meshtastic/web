import { Protobuf } from "@core/protobuf.ts";

type LoRa = Protobuf.Config.Config_LoRaConfig;

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

/**
 * A shared link's modem settings over the radio's LoRa section. A link
 * carries a whole LoRa message, where unset proto3 fields read as zero, so
 * only the fields that make radios hear each other are taken; this radio's
 * own settings (tx_enabled, tx_power, ...) stay, and an unset region or hop
 * limit in the link doesn't clear the radio's.
 */
export function mergeLinkLora(current: LoRa, link: LoRa): LoRa {
  return {
    ...current,
    usePreset: link.usePreset,
    modemPreset: link.modemPreset,
    bandwidth: link.bandwidth,
    spreadFactor: link.spreadFactor,
    codingRate: link.codingRate,
    channelNum: link.channelNum,
    overrideFrequency: link.overrideFrequency,
    frequencyOffset: link.frequencyOffset,
    region: link.region === Region.UNSET ? current.region : link.region,
    hopLimit: link.hopLimit > 0 ? link.hopLimit : current.hopLimit,
  };
}
