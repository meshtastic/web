import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";

const ModemPresetEnum = z.enum(Protobuf.Config.Config_LoRaConfig_ModemPreset);
const RegionCodeEnum = z.enum(Protobuf.Config.Config_LoRaConfig_RegionCode);

export const LoRaValidationSchema = z.object({
  usePreset: z.boolean(),
  modemPreset: ModemPresetEnum,
  bandwidth: z.coerce.number().int(),
  spreadFactor: z.coerce.number().int().max(12),
  codingRate: z.coerce.number().int().min(0).max(10),
  frequencyOffset: z.coerce.number().int(),
  region: RegionCodeEnum,
  hopLimit: z.coerce.number().int().min(0).max(7),
  txEnabled: z.boolean(),
  txPower: z.coerce.number().int().min(0),
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
});

export type LoRaValidation = z.infer<typeof LoRaValidationSchema>;
