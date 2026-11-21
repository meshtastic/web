/**
 * Length limits for text fields. Radio fields are fixed-size protobuf
 * strings, so they are capped in UTF-8 bytes: long name (24, firmware
 * truncation), short name (4, a 5-byte field with its terminator), status
 * message (80) and chat text (200). `chars` mode is for app-side limits
 * that are not sent to the radio.
 */

export type TextLimitMode = "bytes" | "chars";

export interface TextLimitSpec {
  readonly max: number;
  readonly mode: TextLimitMode;
}

export interface TextLimitState {
  readonly used: number;
  readonly limit: number;
  /** How many units are left; negative once over. */
  readonly remaining: number;
  readonly over: boolean;
}

const encoder = new TextEncoder();

/** Number of bytes `text` takes in UTF-8. */
export const utf8ByteLength = (text: string): number =>
  encoder.encode(text).length;

/**
 * Unicode code points: a single-code-point emoji or accented letter counts
 * once (where `String.length` counts surrogate pairs twice). Multi-code-
 * point graphemes do not count once: a flag is 2, a ZWJ family emoji 5+.
 * Use `bytes` mode for anything the radio stores.
 */
export const charLength = (text: string): number => Array.from(text).length;

export const measureText = (text: string, mode: TextLimitMode): number =>
  mode === "bytes" ? utf8ByteLength(text) : charLength(text);

export const evaluateTextLimit = (
  text: string,
  spec: TextLimitSpec,
): TextLimitState => {
  const used = measureText(text, spec.mode);
  return {
    used,
    limit: spec.max,
    remaining: spec.max - used,
    over: used > spec.max,
  };
};
