export const randId = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
};
