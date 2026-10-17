import { validateMaxByteLength } from "@core/utils/string.ts";
import { t } from "i18next";
import { z } from "zod/v4";

/**
 * Firmware 2.8 truncates User.long_name to 24 bytes of UTF-8. Emoji and
 * accented letters take more than one byte each, so this is not 24
 * characters.
 */
export const LONG_NAME_MAX_BYTES = 24;

/**
 * ModuleConfig.statusmessage.node_status, shown on the User page from
 * firmware 2.7.20. Android limits it to 80 bytes of UTF-8.
 */
export const NODE_STATUS_MAX_BYTES = 80;

export const UserValidationSchema = z.object({
  // Read-only display fields (preserved on submit).
  nodeId: z.string().optional(),
  hardwareModel: z.string().optional(),
  longName: z
    .string()
    .min(1, t("user.longName.validation.min"))
    .superRefine((value, ctx) => {
      const { isValid, currentLength } = validateMaxByteLength(
        value,
        LONG_NAME_MAX_BYTES,
      );
      if (!isValid) {
        ctx.addIssue({
          code: "custom",
          message: "formValidation.longNameTooManyBytes",
          params: { maximum: LONG_NAME_MAX_BYTES, current: currentLength },
        });
      }
    }),
  shortName: z
    .string()
    .min(1, t("user.shortName.validation.min"))
    .max(4, t("user.shortName.validation.max")),
  // Status Message module's node_status; not part of the owner.
  nodeStatus: z
    .string()
    .superRefine((value, ctx) => {
      const { isValid } = validateMaxByteLength(value, NODE_STATUS_MAX_BYTES);
      if (!isValid) {
        ctx.addIssue({
          code: "custom",
          message: "formValidation.tooBig.bytes",
          params: { maximum: NODE_STATUS_MAX_BYTES },
        });
      }
    })
    .default(""),
  isUnmessageable: z.boolean().default(false),
  isLicensed: z.boolean().default(false),
});

export type UserValidation = z.infer<typeof UserValidationSchema>;
