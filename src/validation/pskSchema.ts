import { z, ZodType } from "zod/v4";
import { toByteArray } from "base64-js";

export function makePskHelpers(
  allowedByteLengths: readonly number[],
) {
  const bitsLabel = allowedByteLengths.map((b) => b * 8).join(" | ");
  const msgs = {
    format: "formValidation.invalidKeyFormat",
    required: "formValidation.keyRequired",
    length: `formValidation.pskLength.${bitsLabel.replace(/ \| /g, "_")}bit`,
  } as const;

  function tryParse(str: string): Uint8Array | null {
    try {
      return toByteArray(str);
    } catch {
      return null;
    }
  }

  function isValidString(str: string): boolean {
    const arr = tryParse(str);
    return arr !== null &&
      allowedByteLengths.includes(arr.byteLength);
  }

  function isValidKey(v: unknown): boolean {
    if (typeof v === "string") return isValidString(v);
    if (v instanceof Uint8Array) {
      return allowedByteLengths.includes(v.byteLength);
    }
    return false;
  }

  const stringSchema = (optional = false) =>
    z.string()
      .refine((s) =>
        optional || s !== "" || (s === "" && allowedByteLengths.includes(0)), {
        message: msgs.required,
      })
      .refine((s) => s === "" || tryParse(s) !== null, { message: msgs.format })
      .refine((s) => s === "" || isValidString(s), {
        message: msgs.length,
        params: { bits: bitsLabel },
      });

  const bytesSchema = (optional = false): ZodType<Uint8Array> =>
    stringSchema(optional).transform((s) =>
      s === "" ? new Uint8Array() : (tryParse(s) as Uint8Array)
    );

  return {
    allowedByteLengths,
    msgs,
    tryParseStringKey: tryParse,
    isValidKey,
    stringSchema,
    bytesSchema,
  };
}
