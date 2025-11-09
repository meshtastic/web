import { t } from "i18next";
import { z } from "zod/v4";

export const UserValidationSchema = z.object({
  longName: z
    .string()
    .min(1, t("user.longName.validation.min"))
    .max(40, t("user.longName.validation.max")),
  shortName: z
    .string()
    .min(2, t("user.shortName.validation.min"))
    .max(4, t("user.shortName.validation.max")),
  isUnmessageable: z.boolean().default(false),
  isLicensed: z.boolean().default(false),
});

export type UserValidation = z.infer<typeof UserValidationSchema>;
