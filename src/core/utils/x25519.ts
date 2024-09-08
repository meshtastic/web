import { x25519 } from "@noble/curves/ed25519";

export function getX25519PrivateKey(): Uint8Array {
  const key = x25519.utils.randomPrivateKey();

  key[0] &= 248;
  key[31] &= 127;
  key[31] |= 64;

  return key;
}

export function getX25519PublicKey(privateKey: Uint8Array): Uint8Array {
  return x25519.getPublicKey(privateKey);
}
