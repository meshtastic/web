import { base64Decode } from "@bufbuild/protobuf/wire";
import { type ZodType, z } from "zod/v4";

/**
 * Padded base64 in whole groups of four, standard or URL-safe alphabet.
 * base64Decode also takes unpadded, extra-padded and spaced input, which a
 * key field should reject.
 */
const PADDED_BASE64 =
  /^(?:[A-Za-z0-9+/_-]{4})*(?:[A-Za-z0-9+/_-]{2}==|[A-Za-z0-9+/_-]{3}=)?$/;

export function makePskHelpers(allowedByteLengths: readonly number[]) {
  const bitsLabel = allowedByteLengths.map((b) => b * 8).join(" | ");
  const msgs = {
    format: "formValidation.invalidFormat.key",
    required: "formValidation.required.key",
    length: `formValidation.pskLength.${bitsLabel.replace(/ \| /g, "_")}bit`,
  } as const;

  function tryParse(str: string): Uint8Array | null {
    if (!PADDED_BASE64.test(str)) return null;
    try {
      return base64Decode(str);
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
        {
          message: msgs.required,
        },
      )
      .refine(
        (arr) => optional || allowedByteLengths.includes(arr.byteLength),
        {
          message: msgs.length,
          params: { bits: bitsLabel },
        },
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
