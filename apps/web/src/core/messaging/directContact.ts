import { Protobuf } from "@core/protobuf.ts";
import type { Node } from "@core/storage/types.ts";
import { firmwareAtLeast } from "@core/utils/firmware.ts";

/** Firmware that stores a shared contact sent with `add_contact`. */
export const SHARED_CONTACT_FIRMWARE = "2.7.12";

/**
 * What to tell the radio about the peer before a direct message goes out,
 * as Android's SendMessageUseCase does (meshtastic/design#39):
 *
 * - `shareContact`: firmware 2.7.12+ caches the peer's user and public key
 *   in its NodeDB. Skipped without a key: firmware assigns the key
 *   unconditionally, so a keyless contact would clear the one it holds.
 * - `favorite`: older firmware, on a legacy (non-PKI) DM, favorites the peer
 *   so the NodeDB keeps it. Not on CLIENT_BASE, whose favorites mean
 *   something else, nor for a peer that already is one.
 *
 * Both are best-effort; the message is sent whatever the radio says.
 */
export type DirectContactAction =
  | { readonly kind: "shareContact"; readonly contact: SharedContactFields }
  | { readonly kind: "favorite" }
  | { readonly kind: "none" };

export interface SharedContactFields {
  readonly nodeNum: number;
  readonly user: Protobuf.Mesh.User;
  readonly manuallyVerified: boolean;
}

export function directContactAction(input: {
  readonly peerNum: number;
  readonly peer: Node | undefined;
  readonly me: Node | undefined;
  readonly firmwareVersion: string | undefined;
}): DirectContactAction {
  const { peerNum, peer, me, firmwareVersion } = input;
  const hasKey = (peer?.user?.publicKey?.length ?? 0) > 0;
  if (
    firmwareVersion !== undefined &&
    firmwareAtLeast(firmwareVersion, SHARED_CONTACT_FIRMWARE)
  ) {
    if (!hasKey || !peer?.user) return { kind: "none" };
    return {
      kind: "shareContact",
      contact: {
        nodeNum: peerNum,
        user: peer.user,
        manuallyVerified: peer.isKeyManuallyVerified ?? false,
      },
    };
  }
  // With the peer's key the SDK sends a PKI DM, which Android leaves alone
  // on older firmware; favoriting is for legacy DMs only.
  if (hasKey || peer?.isFavorite) return { kind: "none" };
  if (me?.user?.role === Protobuf.Config.Config_DeviceConfig_Role.CLIENT_BASE) {
    return { kind: "none" };
  }
  return { kind: "favorite" };
}
