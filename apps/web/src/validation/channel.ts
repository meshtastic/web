import { validateMaxByteLength } from "@core/utils/string.ts";
import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";
import { makePskHelpers } from "./pskSchema.ts";

const RoleEnum = z.enum(Protobuf.Channel.Channel_Role);

const moduleSettingsSchema = z.object({
  // `position_precision` is a uint32 the firmware treats as a bit count
  // (0 = disabled, 32 = precise). The dropdown only offers the useful values,
  // but the schema must still accept whatever the device reports: a value it
  // rejects makes the whole channel form permanently invalid, and because
  // `DynamicForm` auto-saves through `handleSubmit`, an invalid form silently
  // stages nothing at all — the toggle flips in the UI and never reaches the
  // radio.
  positionPrecision: z.coerce.number().int().min(0).max(32),
  // Round-trip the mute flag instead of dropping it: the resolver output is
  // what gets serialised, so an undeclared field is reset to `false` on the
  // device every time any channel setting is saved.
  isMuted: z.boolean().optional(),
});

export function makeChannelSchema(allowedBytes: number) {
  const { stringSchema } = makePskHelpers([allowedBytes]);

  const ChannelSettingsSchema = z.object({
    // `ChannelSettings.channel_num` is a deprecated uint32 (a LoRa frequency
    // slot, superseded by `LoRaConfig.channel_num`) — not the 0-7 channel
    // *index*. It is not rendered by this form, so capping it at 7 turned any
    // device or imported channel set carrying a real slot number into a form
    // that could never validate, and therefore never save, with no visible
    // error anywhere in the UI.
    channelNum: z.coerce.number().int().min(0).max(0xff_ff_ff_ff),
    psk: stringSchema(false),
    name: z.string().refine((s) => validateMaxByteLength(s, 12).isValid, {
      message: "formValidation.tooBig.bytes",
      params: { maximum: 12 },
    }),
    id: z.coerce.number().int(),
    uplinkEnabled: z.boolean(),
    downlinkEnabled: z.boolean(),
    moduleSettings: moduleSettingsSchema,
  });

  return z.object({
    index: z.coerce.number(),
    settings: ChannelSettingsSchema,
    role: RoleEnum,
  });
}

const ChannelValidationSchema = makeChannelSchema(0); // generate a schema that doesn't validate PSK length, just structure, for type purposes
export type ChannelValidation = z.infer<typeof ChannelValidationSchema>;
