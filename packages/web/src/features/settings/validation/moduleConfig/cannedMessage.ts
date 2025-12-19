import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";

const InputEventCharEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar,
);

export const CannedMessageValidationSchema = z.object({
  rotary1Enabled: z.boolean(),
  inputbrokerPinA: z.coerce.number().int().min(0),
  inputbrokerPinB: z.coerce.number().int().min(0),
  inputbrokerPinPress: z.coerce.number().int().min(0),
  inputbrokerEventCw: InputEventCharEnum,
  inputbrokerEventCcw: InputEventCharEnum,
  inputbrokerEventPress: InputEventCharEnum,
  updown1Enabled: z.boolean(),
  enabled: z.boolean(),
  allowInputSource: z.string().max(30),
  sendBell: z.boolean(),
});

export type CannedMessageValidation = z.infer<
  typeof CannedMessageValidationSchema
>;
