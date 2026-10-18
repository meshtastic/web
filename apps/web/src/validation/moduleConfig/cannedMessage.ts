import { validateMaxByteLength } from "@core/utils/string.ts";
import { CANNED_MESSAGES_MAX_BYTES, Protobuf } from "@meshtastic/sdk";
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
  // Not part of the module config: sent with its own admin message.
  messages: z
    .string()
    .refine(
      (s) => validateMaxByteLength(s, CANNED_MESSAGES_MAX_BYTES).isValid,
      {
        message: "formValidation.tooBig.bytes",
        params: { maximum: CANNED_MESSAGES_MAX_BYTES },
      },
    ),
});

export type CannedMessageValidation = z.infer<
  typeof CannedMessageValidationSchema
>;
