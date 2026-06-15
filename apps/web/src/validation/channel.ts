import { validateMaxByteLength } from "@core/utils/string.ts";
import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";
import { makePskHelpers } from "./pskSchema.ts";

const RoleEnum = z.enum(Protobuf.Channel.Channel_Role);

const moduleSettingsSchema = z.object({
  positionPrecision: z.union([
    z.literal(0),
    z.coerce.number().int().min(10).max(19),
    z.literal(32),
  ]),
});

export function makeChannelSchema(allowedBytes: number) {
  const { stringSchema } = makePskHelpers([allowedBytes]);

  const ChannelSettingsSchema = z.object({
    channelNum: z.coerce.number().int().min(0).max(7),
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
