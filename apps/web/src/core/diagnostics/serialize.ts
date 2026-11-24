/** Fields whose values never belong in a shared log: keys, passwords, location. */
const SENSITIVE_KEY =
  /psk|passkey|password|secret|token|private_?key|public_?key|admin_?key|^(lat|lon|lng|latitude|longitude)(_?i)?$/i;

const MAX_DEPTH = 3;
const MAX_ITEMS = 20;
/** Longest message kept per log line, in characters. */
export const MAX_MESSAGE_LENGTH = 4000;

function serializeValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): string {
  if (typeof value === "string") return value;
  if (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (typeof value === "function") return "[function]";
  if (typeof value === "symbol") return value.toString();

  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  }
  // Raw bytes can be keys or message payloads: keep only their size.
  if (value instanceof ArrayBuffer) return `<${value.byteLength} bytes>`;
  if (ArrayBuffer.isView(value)) return `<${value.byteLength} bytes>`;

  if (seen.has(value)) return "[circular]";
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? "[…]" : "{…}";
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ITEMS)
      .map((item) => serializeValue(item, depth + 1, seen));
    if (value.length > MAX_ITEMS)
      items.push(`…${value.length - MAX_ITEMS} more`);
    return `[${items.join(", ")}]`;
  }
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;

  const fields = Object.entries(value);
  const shown = fields.slice(0, MAX_ITEMS).map(([key, field]) => {
    const text = SENSITIVE_KEY.test(key)
      ? "[redacted]"
      : serializeValue(field, depth + 1, seen);
    return `${key}: ${text}`;
  });
  if (fields.length > MAX_ITEMS)
    shown.push(`…${fields.length - MAX_ITEMS} more`);
  return `{${shown.join(", ")}}`;
}

/**
 * Turns a logger call's arguments into one line of text for the diagnostics
 * buffer. Byte arrays become their size and sensitive fields are dropped, so
 * nothing secret is held even before the file is redacted on export.
 */
export function serializeLogArgs(args: readonly unknown[]): string {
  const text = args
    .map((arg) => serializeValue(arg, 0, new WeakSet()))
    .join(" ");
  return text.length > MAX_MESSAGE_LENGTH
    ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…`
    : text;
}
