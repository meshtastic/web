/**
 * Text replacements applied to every log line before a diagnostics file is
 * written. Testers post these files publicly, so radio addresses, positions
 * and anything that looks like a key are masked. The scheme and port of a
 * URL are kept: they are often what a connection bug turns on.
 */
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  // URL hosts, including bracketed IPv6: keep scheme, port and path.
  [/\b(https?|wss?):\/\/(?:\[[^\]\s]*\]|[^/\s:?#]+)/gi, "$1://<host>"],
  // mDNS names such as meshtastic.local.
  [/\b[\w-]+(?:\.[\w-]+)*\.local\b/gi, "<host>"],
  // Full IPv6 addresses, and compressed ones containing "::".
  [/\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\b/gi, "<ip>"],
  [
    /(?<![\w:])(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*)?::(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*)?(?![\w:])/gi,
    "<ip>",
  ],
  // IPv4 addresses.
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "<ip>"],
  // Named coordinates: latitude_i=450000000, "longitude": -75.7.
  [
    /\b(lat|lon|lng|latitude|longitude)(_?i)?(["']?\s*[:=]\s*)-?\d+(?:\.\d+)?/gi,
    "$1$2$3<redacted>",
  ],
  // Bare decimal-degree pairs: 45.4215, -75.6972.
  [/-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/g, "<coords>"],
  // Base64 or hex runs that look like keys or encoded payloads: padded, or
  // long and containing a digit. Long plain identifiers have neither.
  [/[A-Za-z0-9+/]{12,}={1,2}/g, "<redacted>"],
  [/(?=[A-Za-z+/]*\d)[A-Za-z0-9+/]{20,}/g, "<redacted>"],
];

export function redactText(text: string): string {
  return RULES.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  );
}
