import { validateMaxByteLength } from "@core/utils/string.ts";
import { z } from "zod/v4";
import { makePskHelpers } from "./pskSchema.ts";

/**
 * Longest channel name in UTF-8 bytes. The protobuf allows 12 bytes, and one
 * of those is the string terminator, so 11 are usable (as on Android).
 */
export const CHANNEL_NAME_MAX_BYTES = 11;

export const POSITION_PRECISION_OFF = 0;
export const POSITION_PRECISION_PRECISE = 32;
export const POSITION_PRECISION_MIN = 10;
export const POSITION_PRECISION_MAX = 19;

const positionPrecisionSchema = z.union([
  z.literal(POSITION_PRECISION_OFF),
  z.coerce
    .number()
    .int()
    .min(POSITION_PRECISION_MIN)
    .max(POSITION_PRECISION_MAX),
  z.literal(POSITION_PRECISION_PRECISE),
]);

/**
 * The fields the edit channel dialog renders. Everything else on the channel
 * (role, id, useAead, moduleSettings.isMuted, ...) is copied from the existing
 * channel when the edit is staged, so it is not validated here.
 *
 * @param allowedBytes the PSK length in bytes the user picked (0, 1, 16 or 32)
 */
export function makeChannelSchema(allowedBytes: number) {
  const { stringSchema } = makePskHelpers([allowedBytes]);

  return z.object({
    name: z
      .string()
      .refine(
        (s) => validateMaxByteLength(s.trim(), CHANNEL_NAME_MAX_BYTES).isValid,
        {
          message: "formValidation.tooBig.bytes",
          params: { maximum: CHANNEL_NAME_MAX_BYTES },
        },
      ),
    psk: stringSchema(false),
    uplinkEnabled: z.boolean(),
    downlinkEnabled: z.boolean(),
    positionPrecision: positionPrecisionSchema,
  });
}

const ChannelValidationSchema = makeChannelSchema(0); // structure only, for the type
export type ChannelValidation = z.infer<typeof ChannelValidationSchema>;
