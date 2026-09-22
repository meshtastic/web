import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

const ModemPresetEnum = z.enum(Protobuf.Config.Config_LoRaConfig_ModemPreset);
const RegionCodeEnum = z.enum(Protobuf.Config.Config_LoRaConfig_RegionCode);
const FemLnaModeEnum = z.enum(Protobuf.Config.Config_LoRaConfig_FEM_LNA_Mode);

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
  femLnaMode: FemLnaModeEnum,
  // `serial_hal_only` (field 107) only exists in firmware-current protobufs.
  // The bindings the app actually loads at runtime (`@meshtastic/sdk` ->
  // `@meshtastic/protobufs`) may predate it, in which case the device's
  // LoRaConfig has no such key and a required `z.boolean()` fails on *every*
  // parse. Because `DynamicForm` auto-saves through `handleSubmit`, that one
  // failing field silently blocks the whole LoRa form: no `setRadioSection`
  // call, nothing staged, nothing transmitted — the save looks fine and the
  // radio never changes. Optional keeps the field editable where it exists
  // without gating the rest of the form where it does not; `ConfigEditor`
  // merges the omitted key back from the device value before transmitting.
  serialHalOnly: z.boolean().optional(),
});

export type LoRaValidation = z.infer<typeof LoRaValidationSchema>;
