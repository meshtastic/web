export function generatePacketId(): number {
  const seed = crypto.getRandomValues(new Uint32Array(1));
  if (!seed[0]) {
    throw new Error("Cannot generate CSPRN");
  }
  return Math.floor(seed[0] * 2 ** -32 * 1e9);
}
