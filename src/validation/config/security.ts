import { z, ZodType } from "zod/v4";
import { toByteArray } from "base64-js";

const KEY_BYTES = 32;
const KEY_BITS = KEY_BYTES * 8;

const keyMsgs = {
  format: "formValidation.invalidKeyFormat",
  length: "formValidation.keyMustBe256BitPsk",
  required: "formValidation.keyRequired",
  isManagedRequired: "formValidation.adminKeyRequiredWhenManaged",
} as const;

function tryParseStringKey(s: string): Uint8Array | null {
  try {
    return toByteArray(s);
  } catch {
    return null;
  }
}
function isValidStringKey(s: string): boolean {
  const arr = tryParseStringKey(s);
  return arr !== null && arr.byteLength === KEY_BYTES;
}
function isValidKey(v: unknown): boolean {
  if (typeof v === "string") return isValidStringKey(v);
  if (v instanceof Uint8Array) return v.byteLength === KEY_BYTES;
  return false;
}

function keyStringSchema(optional = false) {
  return z.string()
    .refine((s) => optional || s !== "", {
      message: keyMsgs.required,
    })
    .refine((s) => s === "" || tryParseStringKey(s) !== null, {
      message: keyMsgs.format,
    })
    .refine((s) => s === "" || isValidStringKey(s), {
      message: keyMsgs.length,
      params: { bits: KEY_BITS },
    });
}
function keyBytesSchema(optional = false) {
  return keyStringSchema(optional)
    .transform((s) => s === "" ? new Uint8Array() : tryParseStringKey(s)!);
}

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
      adminKey: z.tuple([
        keyMaker(true),
        keyMaker(true),
        keyMaker(true),
      ]),
    })
    .check((ctx) => {
      if (ctx.value.isManaged) {
        const hasAdmin = ctx.value.adminKey.some(isValidKey);
        if (!hasAdmin) {
          for (
            const path of [
              ["isManaged"],
              ["adminKey", 0],
            ] as const
          ) {
            ctx.issues.push({
              code: "custom",
              message: keyMsgs.isManagedRequired,
              path: [...path],
              input: ctx.value,
            });
          }
        }
      }
    });
}

export const RawSecuritySchema = makeSecuritySchema(keyStringSchema);
export type RawSecurity = z.infer<typeof RawSecuritySchema>;

export const ParsedSecuritySchema = makeSecuritySchema(keyBytesSchema);
export type ParsedSecurity = z.infer<typeof ParsedSecuritySchema>;
