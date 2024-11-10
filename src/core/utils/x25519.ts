import { x25519 } from "@noble/curves/ed25519";

export function getX25519PrivateKey(): Uint8Array {
  const key = x25519.utils.randomPrivateKey();

  // scalar clamping for curve25519, according to
  // https://www.rfc-editor.org/rfc/rfc7748#section-5
  key[0] &= 248;
  key[31] &= 127;
  key[31] |= 64;

  return key;
}

export function getX25519PublicKey(privateKey: Uint8Array): Uint8Array {
  return x25519.getPublicKey(privateKey);
}
