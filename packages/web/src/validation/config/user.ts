import { t } from "i18next";
import { z } from "zod/v4";

export const UserValidationSchema = z.object({
  longName: z
    .string()
    .min(1, t("deviceName.validation.longNameMin"))
    .max(40, t("deviceName.validation.longNameMax")),
  shortName: z
    .string()
    .min(2, t("deviceName.validation.shortNameMin"))
    .max(4, t("deviceName.validation.shortNameMax")),
  isUnmessageable: z.boolean().default(false),
  isLicensed: z.boolean().default(false),
});

export type UserValidation = z.infer<typeof UserValidationSchema>;
