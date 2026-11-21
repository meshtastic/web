import { urlOrIpv4Schema } from "@components/ConnectionsDrawer/validation.ts";
import {
  LONG_NAME_MAX_BYTES,
  SHORT_NAME_MAX_BYTES,
} from "@app/validation/config/user.ts";
import type { TextLimitSpec } from "@core/utils/textLimit.ts";
import { utf8ByteLength } from "@core/utils/textLimit.ts";
import { Result } from "better-result";

export const LONG_NAME_LIMIT = {
  max: LONG_NAME_MAX_BYTES,
  mode: "bytes",
} as const satisfies TextLimitSpec;

export const SHORT_NAME_LIMIT = {
  max: SHORT_NAME_MAX_BYTES,
  mode: "bytes",
} as const satisfies TextLimitSpec;

export type NameError = "required" | "tooLong";

export interface ProfileInput {
  readonly longName: string;
  readonly shortName: string;
}

export interface ProfileErrors {
  readonly longName?: NameError;
  readonly shortName?: NameError;
}

const checkName = (value: string, maxBytes: number): NameError | undefined => {
  if (value.trim().length === 0) return "required";
  if (utf8ByteLength(value) > maxBytes) return "tooLong";
  return undefined;
};

/** Long name 1–24 bytes, short name 1–4 bytes of UTF-8, as the radio stores them. */
export function validateProfile(input: ProfileInput): ProfileErrors {
  const longName = checkName(input.longName, LONG_NAME_MAX_BYTES);
  const shortName = checkName(input.shortName, SHORT_NAME_MAX_BYTES);
  return {
    ...(longName ? { longName } : {}),
    ...(shortName ? { shortName } : {}),
  };
}

export const isProfileValid = (errors: ProfileErrors): boolean =>
  errors.longName === undefined && errors.shortName === undefined;

export type HttpAddressError = "empty" | "invalid";

/**
 * The radio URL for an address typed in the HTTP option, with the scheme
 * the HTTPS switch picks. Any scheme typed into the address is replaced.
 */
export function httpTarget(
  address: string,
  useHttps: boolean,
): Result<string, HttpAddressError> {
  const host = address.trim().replace(/^https?:\/\//i, "");
  if (host.length === 0) return Result.err("empty");
  const parsed = urlOrIpv4Schema.safeParse(
    `${useHttps ? "https" : "http"}://${host}`,
  );
  return parsed.success ? Result.ok(parsed.data) : Result.err("invalid");
}

/** The host part of an HTTP target, used as the saved connection's name. */
export const httpConnectionName = (address: string): string =>
  address
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
