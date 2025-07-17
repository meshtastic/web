import { toByteArray } from "base64-js";
import { type ZodType, z } from "zod/v4";

export function makePskHelpers(allowedByteLengths: readonly number[]) {
  const bitsLabel = allowedByteLengths.map((b) => b * 8).join(" | ");
  const msgs = {
    format: "formValidation.invalidFormat.key",
    required: "formValidation.required.key",
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
    return arr !== null && allowedByteLengths.includes(arr.byteLength);
  }

  function isValidKey(v: unknown): boolean {
    if (typeof v === "string") {
      return isValidString(v);
    }
    if (v instanceof Uint8Array) {
      return allowedByteLengths.includes(v.byteLength);
    }
    return false;
  }

  const stringSchema = (optional = false) =>
    z
      .string()
      .refine(
        (s) =>
          optional || s !== "" || (s === "" && allowedByteLengths.includes(0)),
        {
          message: msgs.required,
        },
      )
      .refine((s) => s === "" || tryParse(s) !== null, { message: msgs.format })
      .refine((s) => s === "" || isValidString(s), {
        message: msgs.length,
        params: { bits: bitsLabel },
      });

  const bytesSchema = (optional = false): ZodType<Uint8Array> =>
    z
      .instanceof(Uint8Array)
      .refine(
        (arr) =>
          optional || arr.byteLength !== 0 || allowedByteLengths.includes(0),
        { message: msgs.required },
      )
      .refine(
        (arr) => optional || allowedByteLengths.includes(arr.byteLength),
        { message: msgs.length, params: { bits: bitsLabel } },
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
