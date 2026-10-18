import {
  isPresetAllowed,
  isRegionAllowed,
  type LoRaCapabilities,
} from "@core/utils/loraPresets.ts";
import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

const ModemPresetEnum = z.enum(Protobuf.Config.Config_LoRaConfig_ModemPreset);
const RegionCodeEnum = z.enum(Protobuf.Config.Config_LoRaConfig_RegionCode);

export const LoRaValidationSchema = z.object({
  usePreset: z.boolean(),
  modemPreset: ModemPresetEnum,
  bandwidth: z.coerce.number().int(),
  spreadFactor: z.coerce.number().int().max(12),
  codingRate: z.coerce.number().int().min(0).max(10),
  region: RegionCodeEnum,
  hopLimit: z.coerce.number().int().min(0).max(7),
  txEnabled: z.boolean(),
  // Negative dBm supported for external PA attenuation, floor -18.
  txPower: z.coerce.number().int().min(-18),
  channelNum: z.coerce.number().int(),
  overrideDutyCycle: z.boolean(),
  sx126xRxBoostedGain: z.boolean(),
  overrideFrequency: z.coerce
    .number()
    .refine((val) => val === 0 || (val >= 410 && val <= 930), {
      message: "formValidation.invalidOverrideFreq.number",
    }),
  ignoreIncoming: z.coerce.number().array(),
  ignoreMqtt: z.boolean(),
  configOkToMqtt: z.boolean(),
  paFanDisabled: z.boolean().default(false),
});

export type LoRaValidation = z.infer<typeof LoRaValidationSchema>;

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const HardwareModel = Protobuf.Mesh.HardwareModel;

/** The highest LoRa coding rate, 4/8. */
export const MAX_CODING_RATE = 8;

/**
 * The coding-rate denominator each modem preset uses (5 to 8 for 4/5 to
 * 4/8), from the firmware's modemPresetToParams as Android lists it.
 */
const PRESET_CODING_RATES: Partial<
  Record<Protobuf.Config.Config_LoRaConfig_ModemPreset, number>
> = {
  [Preset.VERY_LONG_SLOW]: 8,
  [Preset.LONG_TURBO]: 8,
  [Preset.LONG_FAST]: 5,
  [Preset.LONG_MODERATE]: 8,
  [Preset.LONG_SLOW]: 8,
  [Preset.MEDIUM_FAST]: 5,
  [Preset.MEDIUM_SLOW]: 5,
  [Preset.MEDIUM_TURBO]: 5,
  [Preset.SHORT_FAST]: 5,
  [Preset.SHORT_SLOW]: 5,
  [Preset.SHORT_TURBO]: 5,
  [Preset.LITE_FAST]: 5,
  [Preset.LITE_SLOW]: 5,
  [Preset.NARROW_FAST]: 6,
  [Preset.NARROW_SLOW]: 6,
  [Preset.TINY_FAST]: 5,
  [Preset.TINY_SLOW]: 6,
};

/** The coding rate a preset uses on its own, or undefined if unknown. */
export function presetCodingRate(
  preset: Protobuf.Config.Config_LoRaConfig_ModemPreset,
): number | undefined {
  return PRESET_CODING_RATES[preset];
}

/**
 * The coding rates `codingRate` can raise a preset to while usePreset is on
 * (firmware 2.7.18+). Firmware only applies a rate above the preset's own, so
 * only those are offered, and a preset already at 4/8 has none.
 */
export function codingRateOverrides(
  preset: Protobuf.Config.Config_LoRaConfig_ModemPreset,
): number[] {
  const own = presetCodingRate(preset);
  if (own === undefined) return [];
  const rates: number[] = [];
  for (let rate = own + 1; rate <= MAX_CODING_RATE; rate++) rates.push(rate);
  return rates;
}

/**
 * The stored codingRate as firmware applies it over a preset: the override
 * while it raises the preset's rate, otherwise 0 ("preset default").
 */
export function codingRateOverride(
  preset: Protobuf.Config.Config_LoRaConfig_ModemPreset,
  stored: number,
): number {
  return codingRateOverrides(preset).includes(stored) ? stored : 0;
}

/**
 * With usePreset on, keeps codingRate only while it raises the preset's own
 * rate and stores 0 otherwise, so a value firmware ignores never looks like
 * it applies. Manual settings and unknown presets are returned unchanged.
 */
export function normalizeCodingRate<
  T extends {
    usePreset?: boolean;
    modemPreset?: Protobuf.Config.Config_LoRaConfig_ModemPreset;
    codingRate?: number;
  },
>(cfg: T): T {
  if (
    !cfg.usePreset ||
    cfg.modemPreset === undefined ||
    presetCodingRate(cfg.modemPreset) === undefined
  ) {
    return cfg;
  }
  const codingRate = codingRateOverride(cfg.modemPreset, cfg.codingRate ?? 0);
  return codingRate === cfg.codingRate ? cfg : { ...cfg, codingRate };
}

/**
 * Boards with a PA fan that paFanDisabled controls. Like Android, the switch
 * is also shown while the hardware model is unknown.
 */
const PA_FAN_MODELS = new Set<Protobuf.Mesh.HardwareModel>([
  HardwareModel.UNSET,
  HardwareModel.BETAFPV_2400_TX,
  HardwareModel.RADIOMASTER_900_BANDIT_NANO,
  HardwareModel.RADIOMASTER_900_BANDIT,
]);

export function hasPaFan(
  hwModel: Protobuf.Mesh.HardwareModel | undefined,
): boolean {
  return hwModel === undefined || PA_FAN_MODELS.has(hwModel);
}

/**
 * LoRaValidationSchema plus the device's own limits: the presets legal in the
 * selected region (firmware 2.8 region_presets) and the presets and regions
 * older firmware does not know.
 */
export function makeLoRaValidationSchema(caps: LoRaCapabilities) {
  return LoRaValidationSchema.superRefine((data, ctx) => {
    if (!isRegionAllowed(caps, data.region)) {
      ctx.addIssue({
        code: "custom",
        path: ["region"],
        message: "formValidation.regionNeedsFirmware28",
      });
    }
    if (
      data.usePreset &&
      !isPresetAllowed(caps, data.region, data.modemPreset)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["modemPreset"],
        message: caps.regionPresets
          ? "formValidation.presetNotAllowedInRegion"
          : "formValidation.presetNeedsFirmware28",
      });
    }
  });
}
