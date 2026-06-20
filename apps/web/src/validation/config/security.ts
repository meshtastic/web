import { type ZodType, z } from "zod/v4";
import { makePskHelpers } from "./../pskSchema.ts";

const { stringSchema, bytesSchema, isValidKey } = makePskHelpers([32]); // 256-bit

const isManagedRequiredMsg = "formValidation.required.managed";

function makeSecuritySchema<KeyT>(
  keyMaker: (optional: boolean) => ZodType<KeyT>,
) {
  return z
    .object({
      isManaged: z.boolean(),
      adminChannelEnabled: z.boolean(),
      debugLogApiEnabled: z.boolean(),
      serialEnabled: z.boolean(),

      privateKey: keyMaker(false),
      publicKey: keyMaker(false),
      adminKey: z.tuple([keyMaker(true), keyMaker(true), keyMaker(true)]),
    })
    .check((ctx) => {
      if (ctx.value.isManaged) {
        const hasAdmin = ctx.value.adminKey.some(isValidKey);
        if (!hasAdmin) {
          for (const path of [["isManaged"], ["adminKey", 0]] as const) {
            ctx.issues.push({
              code: "custom",
              message: isManagedRequiredMsg,
              path: [...path],
              input: ctx.value,
            });
          }
        }
      }
    });
}

export const RawSecuritySchema = makeSecuritySchema(stringSchema);
export type RawSecurity = z.infer<typeof RawSecuritySchema>;

export const ParsedSecuritySchema = makeSecuritySchema(bytesSchema);
export type ParsedSecurity = z.infer<typeof ParsedSecuritySchema>;
