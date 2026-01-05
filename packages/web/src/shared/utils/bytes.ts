/**
 * Convert a hex string to Uint8Array
 * @example hexToUint8Array("deadbeef") => Uint8Array([0xde, 0xad, 0xbe, 0xef])
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  return matches
    ? new Uint8Array(matches.map((byte) => parseInt(byte, 16)))
    : new Uint8Array();
}

/**
 * Convert Uint8Array to hex string
 * @example uint8ArrayToHex(Uint8Array([0xde, 0xad])) => "dead"
 */
export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
