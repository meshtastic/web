import { z } from "zod/v4";

/** Trimmed, without the trailing slashes a pasted URL often has. */
export const normalizeHttpAddress = (value: string): string =>
  value.trim().replace(/\/+$/, "");

const IPV4 =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
/** One DNS label: letters, digits and inner hyphens, up to 63 characters. */
const LABEL = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

const isValidHost = (host: string): boolean => {
  // All digits and dots: only a full dotted-quad IPv4 address.
  if (/^[\d.]+$/.test(host)) {
    return IPV4.test(host);
  }
  // A hostname: `localhost`, `meshtastic`, `meshtastic.local`, `radio.example.com`.
  return host.length <= 253 && host.split(".").every((l) => LABEL.test(l));
};

/**
 * Whether a radio address (`host`, `host:port`, with or without an http(s)
 * scheme) is one we can connect to: an IPv4 address or a hostname, with an
 * optional port from 10 to 65535.
 */
export const isValidHttpAddress = (value: string): boolean => {
  const input = normalizeHttpAddress(value).replace(/^https?:\/\//i, "");
  const portMatch = /^(.*):(\d+)$/.exec(input);
  const host = portMatch?.[1] ?? input;
  const port = portMatch?.[2];
  if (port !== undefined) {
    const n = Number.parseInt(port, 10);
    if (n < 10 || n > 65535) {
      return false;
    }
  }
  return isValidHost(host);
};

/** A radio address as a URL, `http://` unless it names a scheme. */
export const urlOrIpv4Schema = z
  .string()
  .transform(normalizeHttpAddress)
  .refine(
    isValidHttpAddress,
    "Must be a valid IPv4 address or host name with optional port (10-65535)",
  )
  .transform((val) => (/^https?:\/\//i.test(val) ? val : `http://${val}`));
