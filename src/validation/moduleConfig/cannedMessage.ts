import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const InputEventCharEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar,
);

export const CannedMessageValidationSchema = z.object({
  rotary1Enabled: z.boolean(),
  inputbrokerPinA: z.int(),
  inputbrokerPinB: z.int(),
  inputbrokerPinPress: z.int(),
  inputbrokerEventCw: InputEventCharEnum,
  inputbrokerEventCcw: InputEventCharEnum,
  inputbrokerEventPress: InputEventCharEnum,
  updown1Enabled: z.boolean(),
  enabled: z.boolean(),
  allowInputSource: z.string().min(2).max(30),
  sendBell: z.boolean(),
});

export type CannedMessageValidation = z.infer<
  typeof CannedMessageValidationSchema
>;
