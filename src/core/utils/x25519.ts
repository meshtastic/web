import { x25519 } from "@noble/curves/ed25519";

export function getX25519PrivateKey(): Uint8Array {
  return x25519.utils.randomPrivateKey();
}

export function getX25519PublicKey(privateKey: Uint8Array): Uint8Array {
  return x25519.getPublicKey(privateKey);
}
