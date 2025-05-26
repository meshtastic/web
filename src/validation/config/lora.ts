import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const ModemPresetEnum = z.enum(
  Protobuf.Config.Config_LoRaConfig_ModemPreset,
);
const RegionCodeEnum = z.enum(
  Protobuf.Config.Config_LoRaConfig_RegionCode,
);

export const LoRaValidationSchema = z.object({
  usePreset: z.boolean(),
  modemPreset: ModemPresetEnum,
  bandwidth: z.int(),
  spreadFactor: z.int().max(12),
  codingRate: z.int().min(0).max(10),
  frequencyOffset: z.int(),
  region: RegionCodeEnum,
  hopLimit: z.int().min(0).max(7),
  txEnabled: z.boolean(),
  txPower: z.int().min(0),
  channelNum: z.int(),
  overrideDutyCycle: z.boolean(),
  sx126xRxBoostedGain: z.boolean(),
  overrideFrequency: z.int(),
  ignoreIncoming: z.number().array(),
  ignoreMqtt: z.boolean(),
  configOkToMqtt: z.boolean(),
});

export type LoRaValidation = z.infer<typeof LoRaValidationSchema>;
